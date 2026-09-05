<?php

namespace App\Modules\Achievement\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Achievement\Application\AchievementService;
use App\Modules\Achievement\Http\Requests\AchievementEventRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AchievementController extends Controller
{
    public function index(Request $request, AchievementService $achievements): JsonResponse
    {
        return response()->json(['data' => $achievements->collection($request->user())]);
    }

    public function store(AchievementEventRequest $request, AchievementService $achievements): JsonResponse
    {
        return response()->json(['data' => $achievements->recordReminder($request->user())]);
    }

    public function acknowledge(Request $request, string $code, AchievementService $achievements): JsonResponse
    {
        return response()->json(['data' => $achievements->acknowledge($request->user(), $code)]);
    }
}
