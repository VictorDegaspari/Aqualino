<?php

namespace App\Modules\Hydration\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Hydration\Application\HydrationChallengeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HydrationChallengeController extends Controller
{
    public function store(Request $request, HydrationChallengeService $challenges): JsonResponse
    {
        $input = $request->validate(['mode' => ['required', 'in:solo,group']]);
        $user = $request->user()->loadMissing('profile');
        $challenges->start($user, $input['mode']);

        return response()->json(['data' => $challenges->current($user)]);
    }

    public function claim(Request $request, string $challengeId, HydrationChallengeService $challenges): JsonResponse
    {
        return response()->json(['data' => $challenges->claim($request->user()->loadMissing('profile'), $challengeId)]);
    }
}
