<?php

namespace App\Modules\Gamification\Domain;

final class LevelProgression
{
    public static function requiredXp(int $level): int
    {
        return 100 + 25 * (min(99, max(1, $level)) - 1);
    }

    /** @return array{level: int, level_started_at_xp: int} */
    public static function advance(int $xpTotal, int $level, int $startedAtXp): array
    {
        $level = max(1, $level);
        $remaining = max(0, $xpTotal - $startedAtXp);
        while ($level < 100 && $remaining >= self::requiredXp($level)) {
            $cost = self::requiredXp($level);
            $remaining -= $cost;
            $startedAtXp += $cost;
            $level++;
        }
        if ($level >= 100) {
            $gained = intdiv($remaining, self::requiredXp(100));
            $level += $gained;
            $startedAtXp += $gained * self::requiredXp(100);
        }

        return ['level' => $level, 'level_started_at_xp' => $startedAtXp];
    }
}
