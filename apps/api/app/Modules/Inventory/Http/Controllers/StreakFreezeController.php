<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventory\Application\ArmHydrationStreakFreeze;
use App\Modules\Inventory\Application\InventoryQuery;
use App\Modules\Inventory\Application\ReleaseHydrationStreakFreeze;
use App\Modules\Inventory\Http\Requests\UseStreakPotionRequest;
use App\Modules\Inventory\Infrastructure\Models\StreakPotionEffect;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StreakFreezeController extends Controller
{
    public function store(
        UseStreakPotionRequest $request,
        ArmHydrationStreakFreeze $armFreeze,
        InventoryQuery $inventory,
    ): JsonResponse {
        $result = $armFreeze->handle($request->user(), $request->string('client_action_id')->toString());
        $status = $result['idempotent_replay'] ? 200 : 201;

        return response()->json(['data' => [
            'effect' => $this->effectPayload($result['effect']),
            'inventory' => $inventory->forUser($request->user()),
            'streak' => $request->user()->streak?->current_streak ?? 0,
            'idempotent_replay' => $result['idempotent_replay'],
        ]], $status);
    }

    public function destroy(
        Request $request,
        string $effectId,
        ReleaseHydrationStreakFreeze $releaseFreeze,
        InventoryQuery $inventory,
    ): JsonResponse {
        $result = $releaseFreeze->handle($request->user(), $effectId);

        return response()->json(['data' => [
            'effect' => $this->effectPayload($result['effect']),
            'inventory' => $inventory->forUser($request->user()),
            'streak' => $request->user()->streak?->current_streak ?? 0,
            'idempotent_replay' => $result['idempotent_replay'],
        ]]);
    }

    /**
     * @return array<string, mixed>
     */
    private function effectPayload(StreakPotionEffect $effect): array
    {
        return [
            'id' => $effect->id,
            'item_code' => $effect->item_code->value,
            'scope_type' => $effect->scope_type,
            'status' => $effect->status->value,
            'eligible_from' => $effect->eligible_from?->toDateString(),
            'target_local_date' => $effect->target_local_date?->toDateString(),
            'created_at' => $effect->created_at->toIso8601String(),
        ];
    }
}
