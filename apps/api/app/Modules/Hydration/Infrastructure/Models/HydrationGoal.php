<?php

namespace App\Modules\Hydration\Infrastructure\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class HydrationGoal extends Model
{
    use HasUlids, SoftDeletes;

    protected $fillable = ['user_id', 'daily_goal_ml', 'starts_on', 'ends_on', 'source'];

    protected function casts(): array
    {
        return ['starts_on' => 'immutable_date', 'ends_on' => 'immutable_date'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
