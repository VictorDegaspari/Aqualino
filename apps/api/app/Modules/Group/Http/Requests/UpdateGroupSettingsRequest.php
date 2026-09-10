<?php

namespace App\Modules\Group\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGroupSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'photo_review_enabled' => ['required_without:auto_restart', 'boolean'],
            'auto_restart' => ['required_without:photo_review_enabled', 'boolean'],
        ];
    }
}
