<?php

namespace App\Console\Commands;

use App\Shared\Application\Jobs\ProcessOutboxEvent;
use App\Shared\Infrastructure\Models\OutboxEvent;
use Illuminate\Console\Command;

class DispatchOutboxEvents extends Command
{
    protected $signature = 'outbox:dispatch {--limit=100}';

    protected $description = 'Dispatch available transactional outbox events';

    public function handle(): int
    {
        $events = OutboxEvent::query()
            ->whereNull('processed_at')
            ->where('available_at', '<=', now())
            ->oldest('available_at')
            ->limit((int) $this->option('limit'))
            ->get(['id']);

        foreach ($events as $event) {
            ProcessOutboxEvent::dispatch($event->id);
        }

        $this->info("Dispatched {$events->count()} outbox event(s).");

        return self::SUCCESS;
    }
}
