<?php

namespace App\Modules\Group\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GroupInviteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('code'))) {
            $this->merge(['code' => strtoupper(trim($this->input('code')))]);
        }
    }

    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'regex:/^[A-Z0-9]{12}$/'],
            'accept' => $this->routeIs('groups.accept') ? ['required', 'accepted'] : ['prohibited'],
        ];
    }
}
