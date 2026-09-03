<?php

namespace App\Modules\Inventory\Infrastructure\Models;

use App\Models\User;
use App\Modules\Inventory\Domain\InventoryItemCode;
use Database\Factories\Modules\Inventory\Infrastructure\Models\InventoryBalanceFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryBalance extends Model
{
    /** @use HasFactory<InventoryBalanceFactory> */
    use HasFactory, HasUlids;

    protected $fillable = [
        'user_id',
        'item_code',
        'quantity',
        'reserved_quantity',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected static function newFactory(): InventoryBalanceFactory
    {
        return InventoryBalanceFactory::new();
    }

    protected function casts(): array
    {
        return [
            'item_code' => InventoryItemCode::class,
            'quantity' => 'integer',
            'reserved_quantity' => 'integer',
        ];
    }
}
