<?php

use App\Modules\Achievement\Http\Controllers\AchievementController;
use App\Modules\Friendship\Http\Controllers\FriendshipController;
use App\Modules\Gamification\Http\Controllers\GamificationController;
use App\Modules\Group\Http\Controllers\GroupController;
use App\Modules\Hydration\Http\Controllers\HydrationChallengeController;
use App\Modules\Hydration\Http\Controllers\HydrationController;
use App\Modules\Hydration\Http\Controllers\HydrationGoalController;
use App\Modules\Hydration\Http\Controllers\HydrationReviewController;
use App\Modules\Identity\Http\Controllers\AccountSecurityController;
use App\Modules\Identity\Http\Controllers\AuthController;
use App\Modules\Identity\Http\Controllers\MeController;
use App\Modules\Identity\Http\Middleware\EnsureAccountEmailIsVerified;
use App\Modules\Inventory\Http\Controllers\InventoryController;
use App\Modules\Inventory\Http\Controllers\StreakFreezeController;
use App\Modules\Inventory\Http\Controllers\StreakRevivalController;
use App\Modules\Widget\Http\Controllers\WidgetController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', fn () => ['data' => ['status' => 'ok']]);
    Route::get('/auth/username-availability', [AuthController::class, 'usernameAvailability'])
        ->middleware('throttle:30,1');

    Route::prefix('auth')->middleware('throttle:10,1')->group(function (): void {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/forgot-password', [AccountSecurityController::class, 'forgotPassword']);
        Route::post('/reset-password', [AccountSecurityController::class, 'resetPassword']);
    });

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/email/verification-notification', [AccountSecurityController::class, 'resendVerification'])
            ->middleware('throttle:6,1');
        Route::get('/me', [MeController::class, 'show']);
        Route::patch('/me/profile', [MeController::class, 'update']);
        Route::delete('/me', [MeController::class, 'destroy']);

        Route::middleware(EnsureAccountEmailIsVerified::class)->group(function (): void {
            Route::get('/groups/current', [GroupController::class, 'show']);
            Route::prefix('groups')->middleware('throttle:20,1')->group(function (): void {
                Route::post('/', [GroupController::class, 'store']);
                Route::post('/invites/preview', [GroupController::class, 'preview']);
                Route::post('/invites/accept', [GroupController::class, 'accept'])->name('groups.accept');
                Route::patch('/current/settings', [GroupController::class, 'updateSettings']);
                Route::post('/current/invite', [GroupController::class, 'renewInvite']);
                Route::delete('/current/membership', [GroupController::class, 'leave']);
            });

            Route::get('/hydration/today', [HydrationController::class, 'today']);
            Route::post('/hydration/challenges', [HydrationChallengeController::class, 'store'])->middleware('throttle:20,1');
            Route::post('/hydration/challenges/{challengeId}/reward', [HydrationChallengeController::class, 'claim'])->middleware('throttle:20,1');
            Route::get('/hydration/logs', [HydrationController::class, 'index']);
            Route::get('/groups/current/reviews', [HydrationReviewController::class, 'index']);
            Route::post('/hydration/logs/{logId}/votes', [HydrationReviewController::class, 'store'])->middleware('throttle:60,1');
            Route::get('/hydration/logs/{logId}/photo', [HydrationReviewController::class, 'photo']);
            Route::post('/hydration/logs', [HydrationController::class, 'store']);
            Route::get('/hydration/goals/current', [HydrationGoalController::class, 'show']);
            Route::put('/hydration/goals/current', [HydrationGoalController::class, 'update']);

            Route::get('/gamification/snapshot', [GamificationController::class, 'show']);
            Route::get('/friends', [FriendshipController::class, 'index']);
            Route::get('/people', [FriendshipController::class, 'search'])->middleware('throttle:30,1');
            Route::get('/people/{userId}', [FriendshipController::class, 'show'])->whereUlid('userId');
            Route::put('/friends/{userId}', [FriendshipController::class, 'store'])->whereUlid('userId')->middleware('throttle:20,1');
            Route::post('/friends/{userId}/accept', [FriendshipController::class, 'accept'])->whereUlid('userId')->middleware('throttle:30,1');
            Route::delete('/friends/{userId}', [FriendshipController::class, 'destroy'])->whereUlid('userId')->middleware('throttle:30,1');
            Route::put('/achievements/highlights', [AchievementController::class, 'highlights'])->middleware('throttle:30,1');
            Route::get('/achievements', [AchievementController::class, 'index']);
            Route::post('/achievements/events', [AchievementController::class, 'store'])->middleware('throttle:30,1');
            Route::post('/achievements/{code}/celebration', [AchievementController::class, 'acknowledge'])->middleware('throttle:60,1');
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
});
