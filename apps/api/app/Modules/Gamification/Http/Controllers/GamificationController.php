<?php

namespace App\Modules\Gamification\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Gamification\Application\HydrationXpService;
use App\Modules\Gamification\Application\MascotSnapshotService;
use App\Modules\Gamification\Application\UserLevelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GamificationController extends Controller
{
    public function __construct(private readonly MascotSnapshotService $mascot, private readonly UserLevelService $levels, private readonly HydrationXpService $xp) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('profile', 'streak');

        return response()->json(['data' => [
            ...$this->levels->snapshot($user),
            'xp_multiplier' => $this->xp->todayMultiplier($user),
            'streak' => $user->streak?->current_streak ?? 0,
            'mascot' => $this->mascot->forUser($user),
        ]]);
    }
}
