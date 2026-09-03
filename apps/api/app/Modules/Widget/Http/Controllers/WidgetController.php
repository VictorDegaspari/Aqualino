<?php

namespace App\Modules\Widget\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Gamification\Application\MascotSnapshotService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WidgetController extends Controller
{
    public function __construct(private readonly MascotSnapshotService $mascot) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('profile');

        return response()->json(['data' => $this->mascot->forUser($user)]);
    }
}
