<?php

use App\Modules\Gamification\Http\Controllers\GamificationController;
use App\Modules\Hydration\Http\Controllers\HydrationController;
use App\Modules\Hydration\Http\Controllers\HydrationGoalController;
use App\Modules\Identity\Http\Controllers\AuthController;
use App\Modules\Identity\Http\Controllers\MeController;
use App\Modules\Inventory\Http\Controllers\InventoryController;
use App\Modules\Inventory\Http\Controllers\StreakFreezeController;
use App\Modules\Inventory\Http\Controllers\StreakRevivalController;
use App\Modules\Widget\Http\Controllers\WidgetController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', fn () => ['data' => ['status' => 'ok']]);

    Route::prefix('auth')->middleware('throttle:10,1')->group(function (): void {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    });

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/me', [MeController::class, 'show']);
        Route::patch('/me/profile', [MeController::class, 'update']);
        Route::delete('/me', [MeController::class, 'destroy']);

        Route::get('/hydration/today', [HydrationController::class, 'today']);
        Route::get('/hydration/logs', [HydrationController::class, 'index']);
        Route::post('/hydration/logs', [HydrationController::class, 'store']);
        Route::get('/hydration/goals/current', [HydrationGoalController::class, 'show']);
        Route::put('/hydration/goals/current', [HydrationGoalController::class, 'update']);

        Route::get('/gamification/snapshot', [GamificationController::class, 'show']);
        Route::get('/inventory', [InventoryController::class, 'show']);
        Route::post('/inventory/streak-freezes', [StreakFreezeController::class, 'store'])
            ->middleware('throttle:30,1');
        Route::delete('/inventory/streak-freezes/{effectId}', [StreakFreezeController::class, 'destroy'])
            ->middleware('throttle:30,1');
        Route::post('/inventory/streak-revivals', [StreakRevivalController::class, 'store'])
            ->middleware('throttle:30,1');
        Route::get('/widget/snapshot', [WidgetController::class, 'show']);
    });
});
