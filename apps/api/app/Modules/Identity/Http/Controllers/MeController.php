<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Group\Application\GroupService;
use App\Modules\Hydration\Application\HydrationGoalService;
use App\Modules\Identity\Http\Requests\UpdateProfileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class MeController extends Controller
{
    public function __construct(private readonly HydrationGoalService $goals) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load('profile', 'streak');
        $today = now($user->profile->timezone)->toDateString();

        return response()->json(['data' => [
            'id' => $user->id,
            'email' => $user->email,
            'xp_total' => $user->xp_total,
            'level' => intdiv($user->xp_total, 100) + 1,
            'profile' => $user->profile,
            'goal' => $this->goals->forDate($user, $today),
            'streak' => $user->streak?->current_streak ?? 0,
        ]]);
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $complete = $validated['onboarding_completed'] ?? false;
        unset($validated['onboarding_completed']);

        if ($complete) {
            $validated['onboarding_completed_at'] = now();
        }

        $profile = $request->user()->profile;
        $profile->update($validated);

        return response()->json(['data' => $profile->fresh()]);
    }

    public function destroy(Request $request, GroupService $groups): Response
    {
        DB::transaction(function () use ($request, $groups): void {
            $user = $request->user();
            $groups->leave($user);
            $user->tokens()->delete();
            $user->delete();
        }, 3);

        return response()->noContent();
    }
}
