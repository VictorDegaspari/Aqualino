<?php

namespace App\Modules\Achievement\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Achievement\Application\AchievementService;
use App\Modules\Achievement\Domain\AchievementCatalog;
use App\Modules\Achievement\Http\Requests\AchievementEventRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

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

    public function highlights(Request $request, AchievementService $achievements): JsonResponse
    {
        $input = $request->validate([
            'codes' => ['present', 'array', 'list', 'max:4'],
            'codes.*' => ['string', 'distinct', Rule::in(array_keys(AchievementCatalog::DEFINITIONS))],
        ]);
        $collection = $achievements->collection($request->user());
        $owned = array_column(array_filter($collection['items'], fn (array $item): bool => $item['unlocked_at'] !== null), 'code');
        if (array_diff($input['codes'], $owned)) {
            throw ValidationException::withMessages(['codes' => ['Escolha somente conquistas desbloqueadas.']]);
        }
        $request->user()->profile->update(['achievement_highlights' => $input['codes']]);

        return response()->json(['data' => [...$collection, 'profile_highlights' => $input['codes']]]);
    }

    public function acknowledge(Request $request, string $code, AchievementService $achievements): JsonResponse
    {
        return response()->json(['data' => $achievements->acknowledge($request->user(), $code)]);
    }
}
