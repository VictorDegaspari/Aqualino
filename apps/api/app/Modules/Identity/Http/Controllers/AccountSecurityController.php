<?php

namespace App\Modules\Identity\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Identity\Application\AccountEmailContent;
use App\Modules\Identity\Application\AccountSecurityService;
use App\Modules\Identity\Http\Requests\ForgotPasswordRequest;
use App\Modules\Identity\Http\Requests\ResetPasswordRequest;
use App\Shared\Http\ApiResponse;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Throwable;

class AccountSecurityController extends Controller
{
    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        try {
            Password::sendResetLink($request->validated());
        } catch (Throwable $exception) {
            report($exception);
        }

        return response()->json(['data' => [
            'message' => 'Se a conta existir, enviaremos as instruções de recuperação.', 'retry_after' => 60,
        ]], 202);
    }

    public function resetPassword(ResetPasswordRequest $request, AccountSecurityService $security): JsonResponse
    {
        if (! $security->resetPassword($request->safe()->only(['email', 'token', 'password', 'password_confirmation']))) {
            return ApiResponse::error($request, 'PASSWORD_RESET_INVALID', 'Este link é inválido ou expirou. Solicite um novo.', 422);
        }

        return response()->json(['data' => ['message' => 'Senha atualizada. Entre novamente com sua nova senha.']]);
    }

    public function resendVerification(Request $request, AccountSecurityService $security): JsonResponse
    {
        try {
            $security->sendVerification($request->user());
        } catch (Throwable $exception) {
            report($exception);

            return ApiResponse::error($request, 'EMAIL_DELIVERY_UNAVAILABLE', 'Não foi possível enviar o e-mail. Tente novamente.', 503);
        }

        return response()->json(['data' => [
            'email_verified_at' => $request->user()->email_verified_at?->toIso8601String(), 'retry_after' => 60,
        ]], 202);
    }

    public function resetPage(Request $request): Response
    {
        $email = $request->query('email');
        $token = $request->query('token');
        $email = is_string($email) && strlen($email) <= 255 ? mb_strtolower(trim($email)) : '';
        $token = is_string($token) && strlen($token) <= 256 ? $token : '';
        $locale = $request->query('locale') === 'en-US' ? 'en-US' : 'pt-BR';
        $copy = AccountEmailContent::for($locale, 'reset');
        $validInput = filter_var($email, FILTER_VALIDATE_EMAIL) && preg_match('/^[a-zA-Z0-9]{32,256}$/', $token);

        return $this->page([
            'copy' => $copy, 'action' => 'reset', 'email' => $email, 'token' => $token,
            'validInput' => (bool) $validInput,
            'appUrl' => $validInput ? 'aqualino://auth/reset-password?'.http_build_query(compact('email', 'token', 'locale'), '', '&', PHP_QUERY_RFC3986) : 'aqualino://auth/forgot-password',
        ]);
    }

    public function verifyEmail(Request $request, string $id, string $hash): Response
    {
        $valid = false;
        if ($request->hasValidSignature(absolute: false)) {
            $valid = DB::transaction(function () use ($id, $hash): bool {
                $user = User::query()->whereKey($id)->lockForUpdate()->first();
                if (! $user || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
                    return false;
                }
                if (! $user->hasVerifiedEmail()) {
                    $user->markEmailAsVerified();
                    DB::afterCommit(fn () => event(new Verified($user)));
                }

                return true;
            }, 3);
        }
        $locale = $request->query('locale') === 'en-US' ? 'en-US' : 'pt-BR';

        return $this->page([
            'copy' => AccountEmailContent::for($locale, $valid ? 'verified' : 'invalid'),
            'action' => $valid ? 'verified' : 'invalid',
            'appUrl' => 'aqualino://home?source=email_verification',
        ], $valid ? 200 : 403);
    }

    private function page(array $data, int $status = 200): Response
    {
        return response()->view('auth.account-action', $data, $status)->withHeaders([
            'Cache-Control' => 'no-store, private', 'Referrer-Policy' => 'no-referrer', 'X-Frame-Options' => 'DENY',
        ]);
    }
}
