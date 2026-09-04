<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationLocaleTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_persists_the_selected_locale(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'email' => 'taylor@example.com',
            'password' => 'secure123',
            'password_confirmation' => 'secure123',
            'display_name' => 'Taylor',
            'username' => 'taylor_blue',
            'timezone' => 'America/Sao_Paulo',
            'locale' => 'en-US',
            'terms_accepted' => true,
            'terms_version' => '2026-09-02',
            'device_name' => 'Taylor’s phone',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.user.profile.locale', 'en-US');

        $this->assertDatabaseHas('user_profiles', [
            'username' => 'taylor_blue',
            'locale' => 'en-US',
        ]);
    }
}
