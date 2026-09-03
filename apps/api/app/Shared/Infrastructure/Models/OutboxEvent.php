<?php

namespace App\Shared\Infrastructure\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;

class OutboxEvent extends Model
{
    use HasUlids;

    protected $fillable = [
        'type',
        'aggregate_id',
        'payload',
        'available_at',
        'processed_at',
        'attempts',
        'last_error',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'available_at' => 'immutable_datetime',
            'processed_at' => 'immutable_datetime',
        ];
    }
}
