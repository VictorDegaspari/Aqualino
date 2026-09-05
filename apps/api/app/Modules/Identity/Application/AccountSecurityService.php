<?php

namespace App\Modules\Identity\Application;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;

final class AccountSecurityService
{
    public function sendVerification(User $user): void
    {
        if ($user->hasVerifiedEmail()) {
            return;
        }
        RateLimiter::attempt('email-verification:'.$user->id, 1, function () use ($user): void {
            $user->sendEmailVerificationNotification();
        }, 60);
    }

    public function resetPassword(array $input): bool
    {
        return DB::transaction(function () use ($input): bool {
            User::query()->where('email', $input['email'])->lockForUpdate()->first();
            $status = Password::reset($input, function (User $user, string $password): void {
                $user->forceFill(['password' => $password])->save();
                $user->tokens()->delete();
                DB::table('sessions')->where('user_id', $user->id)->delete();
                DB::afterCommit(fn () => event(new PasswordReset($user)));
            });

            return $status === Password::PASSWORD_RESET;
        }, 3);
    }
}
