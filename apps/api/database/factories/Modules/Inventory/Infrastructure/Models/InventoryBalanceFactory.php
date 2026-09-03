<?php

namespace Database\Factories\Modules\Inventory\Infrastructure\Models;

use App\Models\User;
use App\Modules\Inventory\Domain\InventoryItemCode;
use App\Modules\Inventory\Infrastructure\Models\InventoryBalance;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InventoryBalance>
 */
class InventoryBalanceFactory extends Factory
{
    protected $model = InventoryBalance::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'item_code' => fake()->randomElement(InventoryItemCode::cases()),
            'quantity' => 1,
            'reserved_quantity' => 0,
        ];
    }
}
