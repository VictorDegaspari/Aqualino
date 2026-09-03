<?php

namespace App\Modules\Identity\Infrastructure\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserProfile extends Model
{
    protected $primaryKey = 'user_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'user_id',
        'display_name',
        'username',
        'avatar_url',
        'timezone',
        'locale',
        'favorite_volumes_ml',
        'onboarding_completed_at',
    ];

    protected function casts(): array
    {
        return [
            'favorite_volumes_ml' => 'array',
            'onboarding_completed_at' => 'immutable_datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
