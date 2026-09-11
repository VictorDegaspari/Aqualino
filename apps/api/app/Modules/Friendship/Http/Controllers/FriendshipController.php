<?php

namespace App\Modules\Friendship\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Achievement\Application\AchievementService;
use App\Modules\Friendship\Application\FriendshipService;
use App\Modules\Group\Application\GroupChallengeService;
use App\Modules\Hydration\Application\WeeklyHydrationQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FriendshipController extends Controller
{
    public function __construct(private readonly FriendshipService $friends) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->friends->collection($request->user())]);
    }

    public function search(Request $request): JsonResponse
    {
        $input = $request->validate(['query' => ['required', 'string', 'regex:/^@?[a-zA-Z0-9_]{3,24}$/']]);

        return response()->json(['data' => $this->friends->search($request->user(), $input['query'])]);
    }

    public function show(Request $request, string $userId, AchievementService $achievements, GroupChallengeService $challenges, WeeklyHydrationQuery $hydration): JsonResponse
    {
        return response()->json(['data' => $this->friends->profile($request->user(), $this->friends->person($userId), $achievements, $challenges, $hydration)]);
    }

    public function store(Request $request, string $userId): JsonResponse
    {
        return response()->json(['data' => $this->friends->change($request->user(), $this->friends->person($userId), 'request')]);
    }

    public function accept(Request $request, string $userId): JsonResponse
    {
        return response()->json(['data' => $this->friends->change($request->user(), $this->friends->person($userId), 'accept')]);
    }

    public function destroy(Request $request, string $userId): JsonResponse
    {
        return response()->json(['data' => $this->friends->change($request->user(), $this->friends->person($userId), 'remove')]);
    }
}
