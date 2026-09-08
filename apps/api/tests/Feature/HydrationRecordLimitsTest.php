<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HydrationRecordLimitsTest extends TestCase
{
    use RefreshDatabase;

    public function test_daily_limit_includes_invalidated_records_and_resets_at_local_midnight(): void
    {
        $this->travelTo(now()->setDate(2026, 9, 7)->setTime(12, 0));
        $user = $this->user();
        foreach (range(1, 15) as $index) {
            $this->postJson('/api/v1/hydration/logs', $this->input())->assertCreated();
            $this->travel(15)->minutes();
        }
        $user->hydrationLogs()->first()->update(['invalidated_at' => now()]);
        $this->postJson('/api/v1/hydration/logs', $this->input())->assertUnprocessable();
        $this->getJson('/api/v1/hydration/today')->assertJsonPath('data.today.recording_limits.remaining_today', 0);
        $this->travelTo(now()->setDate(2026, 9, 8)->setTime(3, 0));
        $this->postJson('/api/v1/hydration/logs', $this->input())->assertCreated()->assertJsonPath('data.today.recording_limits.recorded_today', 1);
        $this->assertDatabaseCount('hydration_logs', 16);
    }

    public function test_fifteen_minute_interval_applies_across_midnight_and_to_both_sides_of_offline_events(): void
    {
        $this->travelTo(now()->setDate(2026, 9, 8)->setTime(2, 55));
        $this->user();
        $this->postJson('/api/v1/hydration/logs', $this->input())->assertCreated();
        $this->travel(5)->minutes();
        $this->postJson('/api/v1/hydration/logs', $this->input())->assertUnprocessable();
        $this->postJson('/api/v1/hydration/logs', [...$this->input(), 'occurred_at' => '2026-09-08T02:54:00Z'])->assertUnprocessable();
        $this->travel(10)->minutes();
        $this->postJson('/api/v1/hydration/logs', $this->input())->assertCreated();
        $this->postJson('/api/v1/hydration/logs', [...$this->input(), 'occurred_at' => '2026-09-08T02:40:00Z'])->assertCreated();
        $this->assertDatabaseCount('hydration_logs', 3);
    }

    public function test_retry_does_not_use_another_slot_or_trigger_the_interval(): void
    {
        $this->freezeTime();
        $this->user();
        $input = $this->input();
        $this->postJson('/api/v1/hydration/logs', $input)->assertCreated();
        $this->postJson('/api/v1/hydration/logs', $input)->assertOk()->assertJsonPath('data.idempotent_replay', true);
        $this->assertDatabaseCount('hydration_logs', 1);
    }

    private function user(): User
    {
        $user = User::factory()->create();
        $user->profile()->create(['display_name' => 'Pessoa', 'username' => 'u'.Str::lower(Str::random(12)), 'timezone' => 'America/Sao_Paulo', 'locale' => 'pt-BR', 'favorite_volumes_ml' => [300]]);
        Sanctum::actingAs($user);

        return $user;
    }

    private function input(): array
    {
        return ['amount_ml' => 300, 'client_event_id' => (string) Str::uuid()];
    }
}
