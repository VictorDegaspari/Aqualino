<?php

namespace App\Modules\Inventory\Infrastructure\Models;

use App\Models\User;
use App\Modules\Inventory\Domain\InventoryItemCode;
use App\Modules\Inventory\Domain\StreakPotionEffectStatus;
use Database\Factories\Modules\Inventory\Infrastructure\Models\StreakPotionEffectFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class StreakPotionEffect extends Model
{
    /** @use HasFactory<StreakPotionEffectFactory> */
    use HasFactory, HasUlids, SoftDeletes;

    protected $fillable = [
        'user_id',
        'item_code',
        'scope_type',
        'scope_id',
        'scope_key',
        'client_action_id',
        'status',
        'active_key',
        'eligible_from',
        'target_local_date',
        'consumed_at',
        'released_at',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected static function newFactory(): StreakPotionEffectFactory
    {
        return StreakPotionEffectFactory::new();
    }

    protected function casts(): array
    {
        return [
            'item_code' => InventoryItemCode::class,
            'status' => StreakPotionEffectStatus::class,
            'eligible_from' => 'immutable_date',
            'target_local_date' => 'immutable_date',
            'consumed_at' => 'immutable_datetime',
            'released_at' => 'immutable_datetime',
        ];
    }
}
