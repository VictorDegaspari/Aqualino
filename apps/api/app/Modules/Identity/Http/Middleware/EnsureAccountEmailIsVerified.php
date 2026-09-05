<?php

namespace App\Modules\Identity\Http\Middleware;

use App\Shared\Http\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountEmailIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user?->email_verification_required && ! $user->hasVerifiedEmail()) {
            return ApiResponse::error($request, 'EMAIL_VERIFICATION_REQUIRED', 'Confirme seu e-mail para continuar.', 403);
        }

        return $next($request);
    }
}
