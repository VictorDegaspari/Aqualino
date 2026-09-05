<?php

namespace App\Models;

use App\Modules\Achievement\Infrastructure\Models\UserAchievement;
use App\Modules\Gamification\Infrastructure\Models\UserStreak;
use App\Modules\Hydration\Infrastructure\Models\DailyUserStat;
use App\Modules\Hydration\Infrastructure\Models\HydrationGoal;
use App\Modules\Hydration\Infrastructure\Models\HydrationLog;
use App\Modules\Identity\Infrastructure\Models\UserProfile;
use App\Modules\Identity\Notifications\ResetAccountPassword;
use App\Modules\Identity\Notifications\VerifyAccountEmail;
use App\Modules\Inventory\Infrastructure\Models\InventoryBalance;
use App\Modules\Inventory\Infrastructure\Models\InventoryTransaction;
use App\Modules\Inventory\Infrastructure\Models\PotionUsageBlock;
use App\Modules\Inventory\Infrastructure\Models\StreakPotionEffect;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['email', 'password', 'terms_version', 'terms_accepted_at', 'xp_total'])]
#[Hidden(['password'])]
class User extends Authenticatable implements HasLocalePreference, MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUlids, Notifiable, SoftDeletes;

    public function preferredLocale(): string
    {
        return $this->profile?->locale === 'en-US' ? 'en-US' : 'pt-BR';
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyAccountEmail($this));
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetAccountPassword($token, $this));
    }

    public function profile(): HasOne
    {
        return $this->hasOne(UserProfile::class);
    }

    public function hydrationGoals(): HasMany
    {
        return $this->hasMany(HydrationGoal::class);
    }

    public function hydrationLogs(): HasMany
    {
        return $this->hasMany(HydrationLog::class);
    }

    public function streak(): HasOne
    {
        return $this->hasOne(UserStreak::class);
    }

    public function dailyStats(): HasMany
    {
        return $this->hasMany(DailyUserStat::class);
    }

    public function achievements(): HasMany
    {
        return $this->hasMany(UserAchievement::class);
    }

    public function inventoryBalances(): HasMany
    {
        return $this->hasMany(InventoryBalance::class);
    }

    public function inventoryTransactions(): HasMany
    {
        return $this->hasMany(InventoryTransaction::class);
    }

    public function streakPotionEffects(): HasMany
    {
        return $this->hasMany(StreakPotionEffect::class);
    }

    public function potionUsageBlocks(): HasMany
    {
        return $this->hasMany(PotionUsageBlock::class);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'xp_total' => 'integer',
            'level' => 'integer',
            'level_started_at_xp' => 'integer',
            'email_verified_at' => 'datetime',
            'email_verification_required' => 'boolean',
            'terms_accepted_at' => 'immutable_datetime',
            'password' => 'hashed',
        ];
    }
}
