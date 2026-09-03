<?php

namespace App\Modules\Identity\Http\Requests;

use DateTimeZone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => mb_strtolower(trim((string) $this->input('email'))),
            'username' => mb_strtolower(trim((string) $this->input('username'))),
        ]);
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
            'display_name' => ['required', 'string', 'min:2', 'max:80'],
            'username' => ['required', 'string', 'regex:/^[a-z0-9_]{3,24}$/', 'unique:user_profiles,username'],
            'timezone' => ['required', 'string', Rule::in(DateTimeZone::listIdentifiers())],
            'terms_accepted' => ['accepted'],
            'terms_version' => ['required', 'string', 'max:32'],
            'device_name' => ['sometimes', 'string', 'max:80'],
        ];
    }
}
