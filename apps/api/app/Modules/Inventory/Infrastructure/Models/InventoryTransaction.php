<?php

namespace App\Modules\Inventory\Infrastructure\Models;

use App\Models\User;
use App\Modules\Inventory\Domain\InventoryItemCode;
use App\Modules\Inventory\Domain\InventoryTransactionSource;
use Database\Factories\Modules\Inventory\Infrastructure\Models\InventoryTransactionFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryTransaction extends Model
{
    /** @use HasFactory<InventoryTransactionFactory> */
    use HasFactory, HasUlids, SoftDeletes;

    protected $fillable = [
        'user_id',
        'item_code',
        'quantity_delta',
        'source_type',
        'source_id',
        'metadata',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected static function newFactory(): InventoryTransactionFactory
    {
        return InventoryTransactionFactory::new();
    }

    protected function casts(): array
    {
        return [
            'item_code' => InventoryItemCode::class,
            'quantity_delta' => 'integer',
            'source_type' => InventoryTransactionSource::class,
            'metadata' => 'array',
        ];
    }
}
