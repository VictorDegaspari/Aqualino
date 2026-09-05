<?php

namespace App\Modules\Achievement\Domain;

final class AchievementCatalog
{
    public const DEFINITIONS = [
        'first_drop' => ['metric' => 'records', 'target' => 1, 'category' => 'beginnings', 'rank' => 10],
        'first_reminder' => ['metric' => 'reminders', 'target' => 1, 'category' => 'beginnings', 'rank' => 20],
        'first_goal' => ['metric' => 'goals', 'target' => 1, 'category' => 'beginnings', 'rank' => 30],
        'team_player' => ['metric' => 'teams', 'target' => 1, 'category' => 'beginnings', 'rank' => 40],
        'streak_3' => ['metric' => 'streak', 'target' => 3, 'category' => 'consistency', 'rank' => 50],
        'streak_7' => ['metric' => 'streak', 'target' => 7, 'category' => 'consistency', 'rank' => 60],
        'goals_7' => ['metric' => 'goals', 'target' => 7, 'category' => 'goals', 'rank' => 70],
        'streak_14' => ['metric' => 'streak', 'target' => 14, 'category' => 'consistency', 'rank' => 80],
        'goals_30' => ['metric' => 'goals', 'target' => 30, 'category' => 'goals', 'rank' => 90],
        'streak_30' => ['metric' => 'streak', 'target' => 30, 'category' => 'consistency', 'rank' => 100],
        'level_5' => ['metric' => 'level', 'target' => 5, 'category' => 'levels', 'rank' => 110],
        'level_10' => ['metric' => 'level', 'target' => 10, 'category' => 'levels', 'rank' => 120],
        'level_50' => ['metric' => 'level', 'target' => 50, 'category' => 'levels', 'rank' => 130],
        'level_100' => ['metric' => 'level', 'target' => 100, 'category' => 'levels', 'rank' => 140],
    ];
}
