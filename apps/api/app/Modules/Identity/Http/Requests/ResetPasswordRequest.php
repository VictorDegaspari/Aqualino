<?php

namespace App\Modules\Identity\Http\Requests;

use Illuminate\Validation\Rules\Password;

class ResetPasswordRequest extends ForgotPasswordRequest
{
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'token' => ['required', 'string', 'max:256'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers(), 'max:128'],
            'email_verified_at' => ['prohibited'],
            'email_verification_required' => ['prohibited'],
        ];
    }
}
