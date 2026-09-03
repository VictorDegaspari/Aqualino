<?php

namespace App\Modules\Hydration\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Gamification\Application\MascotSnapshotService;
use App\Modules\Hydration\Application\HydrationPayloadFactory;
use App\Modules\Hydration\Application\HydrationQueryService;
use App\Modules\Hydration\Application\RecordWaterIntake;
use App\Modules\Hydration\Application\WeeklyHydrationQuery;
use App\Modules\Hydration\Http\Requests\StoreHydrationLogRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HydrationController extends Controller
{
    public function __construct(
        private readonly HydrationQueryService $queries,
        private readonly RecordWaterIntake $recordWater,
        private readonly HydrationPayloadFactory $payloads,
        private readonly MascotSnapshotService $mascot,
        private readonly WeeklyHydrationQuery $weeklyHydration,
    ) {}

    public function today(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('profile');

        return response()->json(['data' => [
            'today' => $this->queries->today($user),
            'week' => $this->weeklyHydration->forUser($user),
            'mascot' => $this->mascot->forUser($user),
        ]]);
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'local_date' => ['nullable', 'date_format:Y-m-d'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);
        $user = $request->user()->loadMissing('profile');
        $logs = $this->queries->logs($user, $validated['local_date'] ?? null, $validated['per_page'] ?? 30);

        return response()->json(['data' => $logs->items(), 'meta' => [
            'current_page' => $logs->currentPage(),
            'last_page' => $logs->lastPage(),
            'per_page' => $logs->perPage(),
            'total' => $logs->total(),
        ]]);
    }

    public function store(StoreHydrationLogRequest $request): JsonResponse
    {
        $user = $request->user()->loadMissing('profile');
        $result = $this->recordWater->handle($user, $request->validated());
        $payload = $this->payloads->created($user, $result['log'], $result['idempotent_replay']);

        return response()->json(['data' => $payload], $result['idempotent_replay'] ? 200 : 201);
    }
}
