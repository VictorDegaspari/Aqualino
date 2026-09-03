<?php

namespace App\Modules\Hydration\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Hydration\Application\HydrationGoalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HydrationGoalController extends Controller
{
    public function __construct(private readonly HydrationGoalService $goals) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('profile');
        $today = now($user->profile->timezone)->toDateString();

        return response()->json(['data' => $this->goals->forDate($user, $today)]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate(['daily_goal_ml' => ['required', 'integer', 'between:500,10000']]);
        $user = $request->user()->loadMissing('profile');
        $goal = $this->goals->replaceCurrent($user, $validated['daily_goal_ml']);

        return response()->json(['data' => $goal]);
    }
}
