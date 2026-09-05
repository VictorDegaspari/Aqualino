<?php

namespace App\Modules\Achievement\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AchievementEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'event' => ['required', 'string', Rule::in(['reminder_created'])],
            'code' => ['prohibited'],
            'progress' => ['prohibited'],
            'user_id' => ['prohibited'],
        ];
    }
}
