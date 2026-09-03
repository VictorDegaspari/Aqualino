<?php

namespace App\Modules\Gamification\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Gamification\Application\MascotSnapshotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GamificationController extends Controller
{
    public function __construct(private readonly MascotSnapshotService $mascot) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('profile', 'streak');

        return response()->json(['data' => [
            'xp_total' => $user->xp_total,
            'level' => intdiv($user->xp_total, 100) + 1,
            'streak' => $user->streak?->current_streak ?? 0,
            'mascot' => $this->mascot->forUser($user),
        ]]);
    }
}
