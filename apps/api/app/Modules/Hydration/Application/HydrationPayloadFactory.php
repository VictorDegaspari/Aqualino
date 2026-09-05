<?php

namespace App\Modules\Hydration\Application;

use App\Models\User;
use App\Modules\Gamification\Application\MascotSnapshotService;
use App\Modules\Hydration\Infrastructure\Models\HydrationLog;

class HydrationPayloadFactory
{
    public function __construct(
        private readonly HydrationQueryService $hydration,
        private readonly MascotSnapshotService $mascot,
        private readonly HydrationChallengeService $challenges,
    ) {}

    public function created(User $user, HydrationLog $log, bool $idempotentReplay, array $newAchievements = []): array
    {
        $user->refresh()->load('profile', 'streak');
        $today = $this->hydration->today($user);
        $widget = $this->mascot->forUser($user);

        return [
            'log' => [
                'id' => $log->id,
                'amount_ml' => $log->amount_ml,
                'occurred_at' => $log->occurred_at->utc()->toIso8601String(),
                'local_date' => $log->local_date->toDateString(),
                'source' => $log->source,
                'client_event_id' => $log->client_event_id,
            ],
            'idempotent_replay' => $idempotentReplay,
            'today' => $today,
            'gamification' => [
                'xp_awarded' => $log->xp_awarded,
                'xp_total' => $user->xp_total,
                'level' => intdiv($user->xp_total, 100) + 1,
                'streak' => $user->streak?->current_streak ?? 0,
                'new_achievements' => $newAchievements,
            ],
            'mascot' => [
                'condition' => $widget['condition'],
                'decoration' => $widget['decoration'],
                'animation' => $widget['animation'],
                'static_asset' => $widget['static_asset'],
            ],
            'widget' => $widget,
            'challenges' => $this->challenges->current($user),
        ];
    }
}
