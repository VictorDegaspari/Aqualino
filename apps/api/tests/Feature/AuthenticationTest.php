<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_login_and_logout_with_a_mobile_token(): void
    {
        $registration = $this->postJson('/api/v1/auth/register', [
            'email' => 'ana@example.com',
            'password' => 'segura123',
            'password_confirmation' => 'segura123',
            'display_name' => 'Ana',
            'username' => 'ana_azul',
            'timezone' => 'America/Sao_Paulo',
            'terms_accepted' => true,
            'terms_version' => '2026-09-02',
            'device_name' => 'iPhone da Ana',
        ]);

        $registration
            ->assertCreated()
            ->assertJsonPath('data.user.profile.username', 'ana_azul')
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'email', 'profile']]]);

        $this->assertDatabaseHas('hydration_goals', ['daily_goal_ml' => 2000]);

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => 'ANA@example.com',
            'password' => 'segura123',
            'device_name' => 'Android da Ana',
        ]);

        $token = $login->assertOk()->json('data.token');
        $this->withToken($token)->postJson('/api/v1/auth/logout')
            ->assertOk()
            ->assertJsonPath('data.logged_out', true);
        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_validation_errors_follow_the_api_contract(): void
    {
        $response = $this->postJson('/api/v1/auth/register', []);

        $response
            ->assertUnprocessable()
            ->assertHeader('X-Request-ID')
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonStructure(['error' => ['code', 'message', 'fields', 'request_id']]);
    }
}
