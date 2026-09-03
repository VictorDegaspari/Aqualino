<?php

namespace Database\Factories\Modules\Inventory\Infrastructure\Models;

use App\Models\User;
use App\Modules\Inventory\Domain\InventoryItemCode;
use App\Modules\Inventory\Domain\StreakPotionEffectStatus;
use App\Modules\Inventory\Infrastructure\Models\StreakPotionEffect;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StreakPotionEffect>
 */
class StreakPotionEffectFactory extends Factory
{
    protected $model = StreakPotionEffect::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'item_code' => InventoryItemCode::StreakFreeze,
            'scope_type' => 'hydration',
            'scope_id' => null,
            'scope_key' => 'hydration',
            'client_action_id' => fake()->uuid(),
            'status' => StreakPotionEffectStatus::Armed,
            'active_key' => 'hydration',
            'eligible_from' => now()->toDateString(),
        ];
    }
}
