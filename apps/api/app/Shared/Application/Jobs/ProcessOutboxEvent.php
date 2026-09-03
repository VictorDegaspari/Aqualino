<?php

namespace App\Shared\Application\Jobs;

use App\Shared\Infrastructure\Models\OutboxEvent;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable as FoundationQueueable;
use Illuminate\Support\Facades\Log;

class ProcessOutboxEvent implements ShouldQueue
{
    use FoundationQueueable;

    public int $tries = 5;

    public array $backoff = [10, 30, 120, 300];

    public function __construct(public readonly string $eventId)
    {
        $this->onQueue('gamification');
    }

    public function handle(): void
    {
        $event = OutboxEvent::query()->find($this->eventId);

        if (! $event || $event->processed_at) {
            return;
        }

        Log::info('outbox_event_processed', [
            'event_id' => $event->id,
            'event_type' => $event->type,
            'aggregate_id' => $event->aggregate_id,
        ]);

        $event->update(['processed_at' => now(), 'attempts' => $event->attempts + 1]);
    }

    public function tags(): array
    {
        return ['outbox', 'event:'.$this->eventId];
    }
}
