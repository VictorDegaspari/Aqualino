<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Gamification\Application\HydrationXpService;
use App\Modules\Gamification\Application\UserLevelService;
use App\Modules\Group\Application\GroupChallengeService;
use App\Modules\Hydration\Application\HydrationGoalService;
use App\Modules\Identity\Application\DeleteAccount;
use App\Modules\Identity\Http\Requests\UpdateProfileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MeController extends Controller
{
    public function __construct(private readonly HydrationGoalService $goals, private readonly UserLevelService $levels, private readonly HydrationXpService $xp, private readonly GroupChallengeService $challenges) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load('profile', 'streak');
        $today = now($user->profile->timezone)->toDateString();

        return response()->json(['data' => [
            'id' => $user->id,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'email_verification_required' => $user->requiresEmailVerification(),
            ...$this->levels->snapshot($user),
            'xp_multiplier' => $this->xp->todayMultiplier($user),
            'group_medals' => $this->challenges->medalCounts($user),
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

    public function destroy(Request $request, DeleteAccount $deleteAccount): Response
    {
        $deleteAccount->handle($request->user());

        return response()->noContent();
    }
}
