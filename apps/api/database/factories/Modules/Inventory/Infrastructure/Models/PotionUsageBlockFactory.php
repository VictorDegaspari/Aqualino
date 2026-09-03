<?php

namespace Database\Factories\Modules\Inventory\Infrastructure\Models;

use App\Models\User;
use App\Modules\Inventory\Domain\PotionUsageBlockReason;
use App\Modules\Inventory\Infrastructure\Models\PotionUsageBlock;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PotionUsageBlock>
 */
class PotionUsageBlockFactory extends Factory
{
    protected $model = PotionUsageBlock::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'reason' => PotionUsageBlockReason::GroupChallenge,
            'context_id' => fake()->uuid(),
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDays(6),
        ];
    }
}
