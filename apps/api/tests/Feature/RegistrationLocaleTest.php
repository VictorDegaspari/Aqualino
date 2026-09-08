<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class RegistrationLocaleTest extends TestCase
{
    use RefreshDatabase;

    #[TestWith(['pt-BR'])]
    #[TestWith(['en-US'])]
    #[TestWith(['es-ES'])]
    public function test_registration_persists_the_selected_locale(string $locale): void
    {
        Notification::fake();
        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'taylor@example.com',
            'password' => 'secure123',
            'password_confirmation' => 'secure123',
            'display_name' => 'Taylor',
            'username' => 'taylor_blue',
            'timezone' => 'America/Sao_Paulo',
            'locale' => $locale,
            'terms_accepted' => true,
            'terms_version' => '2026-09-02',
            'device_name' => 'Taylor’s phone',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.user.profile.locale', $locale);

        $this->assertDatabaseHas('user_profiles', [
            'username' => 'taylor_blue',
            'locale' => $locale,
        ]);
    }

    public function test_profile_language_can_be_changed_to_spanish(): void
    {
        $user = User::factory()->create();
        $user->profile()->create(['display_name' => 'Ana', 'username' => 'ana_blue', 'timezone' => 'America/Sao_Paulo', 'locale' => 'pt-BR']);
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/me/profile', ['locale' => 'es-ES'])
            ->assertOk()->assertJsonPath('data.locale', 'es-ES');

        $this->assertDatabaseHas('user_profiles', ['user_id' => $user->id, 'locale' => 'es-ES']);
        $this->assertSame('es-ES', $user->fresh()->preferredLocale());
    }

    public function test_unsupported_language_does_not_replace_saved_preference(): void
    {
        $user = User::factory()->create();
        $user->profile()->create(['display_name' => 'Ana', 'username' => 'ana_blue', 'timezone' => 'America/Sao_Paulo', 'locale' => 'es-ES']);
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/me/profile', ['locale' => 'fr-FR'])
            ->assertUnprocessable()->assertJsonStructure(['error' => ['fields' => ['locale']]]);

        $this->assertDatabaseHas('user_profiles', ['user_id' => $user->id, 'locale' => 'es-ES']);
    }
}
