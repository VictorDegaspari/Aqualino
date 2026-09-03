<?php

namespace App\Modules\Inventory\Infrastructure\Models;

use App\Models\User;
use App\Modules\Inventory\Domain\PotionUsageBlockReason;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Database\Factories\Modules\Inventory\Infrastructure\Models\PotionUsageBlockFactory;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PotionUsageBlock extends Model
{
    /** @use HasFactory<PotionUsageBlockFactory> */
    use HasFactory, HasUlids;

    protected $fillable = [
        'user_id',
        'reason',
        'context_id',
        'starts_at',
        'ends_at',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function isActiveFor(User $user, CarbonInterface $moment): bool
    {
        return self::query()
            ->whereBelongsTo($user)
            ->where('starts_at', '<=', $moment)
            ->where('ends_at', '>=', $moment)
            ->exists();
    }

    public static function overlapsLocalDate(User $user, CarbonImmutable $date, string $timezone): bool
    {
        $startsAt = $date->setTimezone($timezone)->startOfDay()->utc();
        $endsAt = $date->setTimezone($timezone)->endOfDay()->utc();

        return self::query()
            ->whereBelongsTo($user)
            ->where('starts_at', '<=', $endsAt)
            ->where('ends_at', '>=', $startsAt)
            ->exists();
    }

    protected static function newFactory(): PotionUsageBlockFactory
    {
        return PotionUsageBlockFactory::new();
    }

    protected function casts(): array
    {
        return [
            'reason' => PotionUsageBlockReason::class,
            'starts_at' => 'immutable_datetime',
            'ends_at' => 'immutable_datetime',
        ];
    }
}
