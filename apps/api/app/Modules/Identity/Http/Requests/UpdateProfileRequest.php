<?php

namespace App\Modules\Identity\Http\Requests;

use DateTimeZone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('username')) {
            $this->merge(['username' => mb_strtolower(trim((string) $this->input('username')))]);
        }
    }

    public function rules(): array
    {
        return [
            'display_name' => ['sometimes', 'string', 'min:2', 'max:80'],
            'avatar_url' => ['sometimes', 'nullable', 'string', Rule::in([
                'avatar_1', 'avatar_2', 'avatar_3', 'avatar_4',
                'avatar_5', 'avatar_6', 'avatar_7', 'avatar_8',
            ])],
            'username' => [
                'sometimes',
                'string',
                'regex:/^[a-z0-9_]{3,24}$/',
                Rule::unique('user_profiles', 'username')->ignore($this->user()->id, 'user_id'),
            ],
            'timezone' => ['sometimes', 'string', Rule::in(DateTimeZone::listIdentifiers())],
            'locale' => ['sometimes', 'string', Rule::in(['pt-BR', 'en-US'])],
            'favorite_volumes_ml' => ['sometimes', 'array', 'min:1', 'max:6'],
            'favorite_volumes_ml.*' => ['integer', 'min:50', 'max:2000', 'distinct'],
            'onboarding_completed' => ['sometimes', 'boolean'],
        ];
    }
}
