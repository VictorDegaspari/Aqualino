<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Hydration\Infrastructure\Models\HydrationGoal;
use App\Modules\Identity\Application\AccountSecurityService;
use App\Modules\Identity\Http\Requests\LoginRequest;
use App\Modules\Identity\Http\Requests\RegisterRequest;
use App\Modules\Identity\Infrastructure\Models\UserProfile;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Throwable;

class AuthController extends Controller
{
    public function usernameAvailability(Request $request): JsonResponse
    {
        $username = mb_strtolower(trim((string) $request->query('username')));
        $isValid = preg_match('/^[a-z0-9_]{3,24}$/', $username) === 1;

        return response()->json([
            'data' => [
                'valid' => $isValid,
                'available' => $isValid && ! UserProfile::query()->where('username', $username)->exists(),
            ],
        ]);
    }

    public function register(RegisterRequest $request, AccountSecurityService $security): JsonResponse
    {
        $validated = $request->validated();
        $dailyGoalMl = $validated['daily_goal_ml'] ?? 2000;
        $onboardingCompletedAt = ($validated['onboarding_completed'] ?? false) ? now() : null;

        [$user, $token] = DB::transaction(function () use ($dailyGoalMl, $onboardingCompletedAt, $validated): array {
            $user = User::query()->create([
                'email' => $validated['email'],
                'password' => $validated['password'],
                'terms_version' => $validated['terms_version'],
                'terms_accepted_at' => now(),
            ]);
            $user->forceFill(['email_verification_required' => true])->save();

            UserProfile::query()->create([
                'user_id' => $user->id,
                'display_name' => $validated['display_name'],
                'username' => $validated['username'],
                'timezone' => $validated['timezone'],
                'locale' => $validated['locale'] ?? 'pt-BR',
                'favorite_volumes_ml' => [200, 300, 500],
                'onboarding_completed_at' => $onboardingCompletedAt,
            ]);

            HydrationGoal::query()->create([
                'user_id' => $user->id,
                'daily_goal_ml' => $dailyGoalMl,
                'starts_on' => now($validated['timezone'])->toDateString(),
                'source' => 'onboarding',
            ]);

            $token = $user->createToken($validated['device_name'] ?? 'mobile', ['mobile'])->plainTextToken;

            return [$user, $token];
        });

        try {
            $security->sendVerification($user);
        } catch (Throwable $exception) {
            report($exception);
        }

        return response()->json(['data' => $this->authPayload($user, $token)], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = User::query()->where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return ApiResponse::error($request, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.', 422);
        }

        $token = $user->createToken($validated['device_name'] ?? 'mobile', ['mobile'])->plainTextToken;

        return response()->json(['data' => $this->authPayload($user, $token)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['data' => ['logged_out' => true]]);
    }

    private function authPayload(User $user, string $token): array
    {
        $user->load('profile');

        return [
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'email_verified_at' => $user->email_verified_at?->toIso8601String(),
                'email_verification_required' => $user->email_verification_required,
                'profile' => $user->profile,
            ],
        ];
    }
}
