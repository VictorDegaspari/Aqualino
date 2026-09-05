<?php

namespace App\Modules\Group\Infrastructure\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class GroupMembership extends Model
{
    use HasUlids, SoftDeletes;

    protected $fillable = ['group_id', 'user_id', 'slot'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
