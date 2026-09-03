<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Hydration\Infrastructure\Models\HydrationGoal;
use App\Modules\Identity\Http\Requests\LoginRequest;
use App\Modules\Identity\Http\Requests\RegisterRequest;
use App\Modules\Identity\Infrastructure\Models\UserProfile;
use App\Shared\Http\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        [$user, $token] = DB::transaction(function () use ($validated): array {
            $user = User::query()->create([
                'email' => $validated['email'],
                'password' => $validated['password'],
                'terms_version' => $validated['terms_version'],
                'terms_accepted_at' => now(),
            ]);

            UserProfile::query()->create([
                'user_id' => $user->id,
                'display_name' => $validated['display_name'],
                'username' => $validated['username'],
                'timezone' => $validated['timezone'],
                'locale' => 'pt-BR',
                'favorite_volumes_ml' => [200, 300, 500],
            ]);

            HydrationGoal::query()->create([
                'user_id' => $user->id,
                'daily_goal_ml' => 2000,
                'starts_on' => now($validated['timezone'])->toDateString(),
                'source' => 'onboarding',
            ]);

            $token = $user->createToken($validated['device_name'] ?? 'mobile', ['mobile'])->plainTextToken;

            return [$user, $token];
        });

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

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => ['required', 'email:rfc', 'max:255']]);
        Password::sendResetLink(['email' => mb_strtolower($validated['email'])]);

        return response()->json([
            'data' => ['message' => 'Se a conta existir, enviaremos as instruções de recuperação.'],
        ], 202);
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
                'profile' => $user->profile,
            ],
        ];
    }
}
