<?php

namespace App\Modules\Hydration\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreHydrationLogRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['source' => $this->input('source', 'mobile')]);
    }

    public function rules(): array
    {
        return [
            'amount_ml' => ['required', 'integer', 'between:50,2000'],
            'occurred_at' => ['nullable', 'date'],
            'source' => ['required', Rule::in(['mobile', 'widget', 'shortcut', 'import'])],
            'client_event_id' => ['required', 'uuid'],
            'metadata' => ['sometimes', 'array', 'max:8'],
        ];
    }
}
