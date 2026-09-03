<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Application\InventoryQuery;
use App\Modules\Inventory\Application\ReviveHydrationStreak;
use App\Modules\Inventory\Http\Requests\UseStreakPotionRequest;
use Illuminate\Http\JsonResponse;

class StreakRevivalController extends Controller
{
    public function store(
        UseStreakPotionRequest $request,
        ReviveHydrationStreak $reviveStreak,
        InventoryQuery $inventory,
    ): JsonResponse {
        $result = $reviveStreak->handle($request->user(), $request->string('client_action_id')->toString());
        $effect = $result['effect'];
        $status = $result['idempotent_replay'] ? 200 : 201;

        return response()->json(['data' => [
            'effect' => [
                'id' => $effect->id,
                'item_code' => $effect->item_code->value,
                'scope_type' => $effect->scope_type,
                'status' => $effect->status->value,
                'eligible_from' => null,
                'target_local_date' => $effect->target_local_date?->toDateString(),
                'created_at' => $effect->created_at->toIso8601String(),
            ],
            'inventory' => $inventory->forUser($request->user()),
            'streak' => $result['streak'],
            'idempotent_replay' => $result['idempotent_replay'],
        ]], $status);
    }
}
