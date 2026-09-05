<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Identity\Notifications\ResetAccountPassword;
use App\Modules\Identity\Notifications\VerifyAccountEmail;
use Illuminate\Auth\Events\Verified;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class AccountSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_sends_verification_and_protects_new_accounts_until_confirmed(): void
    {
        Notification::fake();
        $result = $this->postJson('/api/v1/auth/register', [
            'email' => 'new@example.com', 'password' => 'segura123', 'password_confirmation' => 'segura123',
            'display_name' => 'Ana', 'username' => 'ana_new', 'timezone' => 'America/Sao_Paulo',
            'locale' => 'pt-BR', 'onboarding_completed' => true, 'terms_accepted' => true, 'terms_version' => '2026-09-02',
        ])->assertCreated()->assertJsonPath('data.user.email_verified_at', null)
            ->assertJsonPath('data.user.email_verification_required', true);
        $user = User::query()->findOrFail($result->json('data.user.id'));
        $url = '';
        Notification::assertSentTo($user, VerifyAccountEmail::class, function ($notification) use (&$url): bool {
            $url = $notification->url;

            return $notification instanceof ShouldQueue && $notification instanceof ShouldBeEncrypted;
        });
        $this->withToken($result->json('data.token'))->getJson('/api/v1/me')->assertOk();
        $this->getJson('/api/v1/groups/current')->assertForbidden()->assertJsonPath('error.code', 'EMAIL_VERIFICATION_REQUIRED');
        $this->postJson('/api/v1/hydration/logs', [])->assertForbidden();
        $this->get($url)->assertOk()->assertSee('E-mail confirmado!')->assertHeader('Referrer-Policy', 'no-referrer');
        $this->assertNotNull($user->fresh()->email_verified_at);
        Sanctum::actingAs($user->fresh());
        $this->getJson('/api/v1/groups/current')->assertOk();
    }

    public function test_existing_accounts_are_not_retroactively_blocked_or_marked_verified(): void
    {
        $user = $this->member(required: false);
        Sanctum::actingAs($user);
        $this->getJson('/api/v1/groups/current')->assertOk();
        $this->getJson('/api/v1/me')->assertOk()->assertJsonPath('data.email_verified_at', null)
            ->assertJsonPath('data.email_verification_required', false);
    }

    public function test_verification_is_idempotent_and_does_not_create_a_login_session(): void
    {
        $user = $this->member();
        $url = (new VerifyAccountEmail($user))->url;
        Event::fake([Verified::class]);
        $this->get($url)->assertOk();
        $date = $user->fresh()->email_verified_at->toISOString();
        $this->travel(1)->minutes();
        $this->get($url)->assertOk();
        $this->assertSame($date, $user->fresh()->email_verified_at->toISOString());
        $this->assertDatabaseCount('personal_access_tokens', 0);
        Event::assertDispatchedTimes(Verified::class, 1);
        $this->travelBack();
    }

    public function test_modified_expired_and_wrong_email_verification_links_are_rejected(): void
    {
        $user = $this->member();
        $other = $this->member();
        $url = (new VerifyAccountEmail($user))->url;
        $this->get(str_replace($user->id, $other->id, $url))->assertForbidden()->assertSee('Vamos tentar outro link');
        $this->travel(61)->minutes();
        $this->get($url)->assertForbidden();
        $this->travelBack();
        $wrongHash = URL::temporarySignedRoute('verification.verify', now()->addHour(), ['id' => $user->id, 'hash' => sha1('other@example.com')], absolute: false);
        $this->get($wrongHash)->assertForbidden();
        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertNull($other->fresh()->email_verified_at);
    }

    public function test_resending_requires_authentication_and_limits_mail_per_account(): void
    {
        Notification::fake();
        $this->postJson('/api/v1/auth/email/verification-notification')->assertUnauthorized();
        $user = $this->member();
        Sanctum::actingAs($user);
        for ($i = 0; $i < 2; $i++) {
            $this->postJson('/api/v1/auth/email/verification-notification')->assertAccepted()->assertJsonPath('data.retry_after', 60);
        }
        Notification::assertSentToTimes($user, VerifyAccountEmail::class, 1);
        $this->travel(61)->seconds();
        $this->postJson('/api/v1/auth/email/verification-notification')->assertAccepted();
        Notification::assertSentToTimes($user, VerifyAccountEmail::class, 2);
        $user->markEmailAsVerified();
        $this->postJson('/api/v1/auth/email/verification-notification')->assertAccepted();
        Notification::assertSentToTimes($user, VerifyAccountEmail::class, 2);
        $this->travelBack();
    }

    public function test_forgot_password_normalizes_email_and_does_not_disclose_account_existence_or_throttling(): void
    {
        Notification::fake();
        $user = $this->member();
        $first = $this->postJson('/api/v1/auth/forgot-password', ['email' => '  '.strtoupper($user->email).'  '])->assertAccepted()->json();
        $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertAccepted()->assertExactJson($first);
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'unknown@example.com'])->assertAccepted()->assertExactJson($first);
        Notification::assertSentToTimes($user, ResetAccountPassword::class, 1);
        Notification::assertSentTo($user, ResetAccountPassword::class, function ($notification): bool {
            return $notification instanceof ShouldQueue && $notification instanceof ShouldBeEncrypted
                && str_contains($notification->url, '/reset-password?token=') && str_contains($notification->url, 'email=');
        });
    }

    public function test_password_reset_changes_credentials_consumes_token_and_revokes_only_the_affected_account_sessions(): void
    {
        $user = $this->member();
        $other = $this->member();
        $user->createToken('phone');
        $user->createToken('tablet');
        $other->createToken('other phone');
        DB::table('sessions')->insert(['id' => 'web-session', 'user_id' => $user->id, 'payload' => 'data', 'last_activity' => time()]);
        $token = Password::createToken($user);
        $input = ['email' => strtoupper($user->email), 'token' => $token, 'password' => 'novaSenha123', 'password_confirmation' => 'novaSenha123'];
        $this->postJson('/api/v1/auth/reset-password', $input)->assertOk();
        $this->assertTrue(Hash::check('novaSenha123', $user->fresh()->password));
        $this->assertFalse(Password::tokenExists($user, $token));
        $this->assertSame(0, $user->tokens()->count());
        $this->assertSame(1, $other->tokens()->count());
        $this->assertDatabaseMissing('sessions', ['id' => 'web-session']);
        $this->assertNull($user->fresh()->email_verified_at);
        $this->postJson('/api/v1/auth/reset-password', [...$input, 'password' => 'outraSenha123', 'password_confirmation' => 'outraSenha123'])
            ->assertUnprocessable()->assertJsonPath('error.code', 'PASSWORD_RESET_INVALID');
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'novaSenha123'])->assertOk();
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'oldSenha123'])->assertUnprocessable();
    }

    public function test_reset_rejects_expired_tokens_and_tokens_belonging_to_another_account(): void
    {
        $user = $this->member();
        $other = $this->member();
        $token = Password::createToken($user);
        $input = ['email' => $other->email, 'token' => $token, 'password' => 'novaSenha123', 'password_confirmation' => 'novaSenha123'];
        $this->postJson('/api/v1/auth/reset-password', $input)->assertUnprocessable()->assertJsonPath('error.code', 'PASSWORD_RESET_INVALID');
        $this->travel(61)->minutes();
        $this->postJson('/api/v1/auth/reset-password', [...$input, 'email' => $user->email])->assertUnprocessable();
        $this->assertTrue(Hash::check('oldSenha123', $user->fresh()->password));
        $this->travelBack();
    }

    #[TestWith(['password', 'onlyletters', 'onlyletters'])]
    #[TestWith(['password', 'abc123', 'abc123'])]
    #[TestWith(['password', 'novaSenha123', 'different123'])]
    public function test_reset_validates_password_strength_and_confirmation(string $field, string $password, string $confirmation): void
    {
        $user = $this->member();
        $token = Password::createToken($user);
        $this->postJson('/api/v1/auth/reset-password', ['email' => $user->email, 'token' => $token, 'password' => $password, 'password_confirmation' => $confirmation])
            ->assertUnprocessable()->assertJsonStructure(['error' => ['fields' => [$field]]]);
        $this->assertTrue(Password::tokenExists($user, $token));
    }

    public function test_registration_cannot_bypass_verification_with_client_fields(): void
    {
        $this->postJson('/api/v1/auth/register', ['email_verified_at' => now()->toISOString(), 'email_verification_required' => false])
            ->assertUnprocessable()->assertJsonStructure(['error' => ['fields' => ['email_verified_at', 'email_verification_required']]]);
        $this->assertDatabaseCount('users', 0);
    }

    public function test_email_and_browser_views_use_the_brand_escape_names_and_support_the_recipient_language(): void
    {
        $user = $this->member();
        $user->profile->update(['display_name' => '<script>alert("name")</script>', 'locale' => 'en-US']);
        $user->refresh();
        foreach ([new VerifyAccountEmail($user), new ResetAccountPassword(str_repeat('a', 64), $user)] as $notification) {
            $mail = $notification->toMail($user);
            $html = view('mail.account-action', $mail->viewData)->render();
            $this->assertStringContainsString('Aqualino', $html);
            $this->assertStringContainsString('#91c8d1', $html);
            $this->assertStringContainsString('&lt;script&gt;', $html);
            $this->assertStringNotContainsString('<script>alert', $html);
        }
        $notification = new ResetAccountPassword(str_repeat('a', 64), $user);
        $this->get($notification->url)->assertOk()->assertSee('Reset your password')->assertSee('aqualino://auth/reset-password')
            ->assertHeader('Cache-Control', 'no-store, private');
        $this->get('/reset-password?token[]=invalid&email[]=invalid')->assertOk()->assertSee('Este link é inválido');
    }

    public function test_email_action_urls_use_the_configured_public_host(): void
    {
        Notification::fake();
        config(['app.url' => 'https://aqualino.example']);
        $user = $this->member();
        $this->withHeader('Host', 'attacker.example')->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertAccepted();
        Notification::assertSentTo($user, ResetAccountPassword::class, fn ($notification) => str_starts_with($notification->url, 'https://aqualino.example/'));
    }

    public function test_notifications_render_through_the_real_mail_channel_with_html_and_plain_text(): void
    {
        config(['mail.default' => 'array']);
        $user = $this->member();
        $user->sendEmailVerificationNotification();
        $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertAccepted();
        $messages = Mail::getSymfonyTransport()->messages();
        $this->assertCount(2, $messages);
        foreach ($messages as $sent) {
            $message = $sent->getOriginalMessage();
            $this->assertSame($user->email, $message->getTo()[0]->getAddress());
            $this->assertStringContainsString('Aqualino', $message->getSubject());
            $this->assertStringContainsString('Aqualino', $message->getHtmlBody());
            $this->assertStringContainsString('http', $message->getTextBody());
        }
    }

    private function member(bool $required = true): User
    {
        $user = User::factory()->unverified()->create(['password' => 'oldSenha123']);
        $user->forceFill(['email_verification_required' => $required])->save();
        $user->profile()->create(['display_name' => 'Ana', 'username' => fake()->unique()->userName(), 'timezone' => 'America/Sao_Paulo', 'locale' => 'pt-BR']);

        return $user;
    }
}
