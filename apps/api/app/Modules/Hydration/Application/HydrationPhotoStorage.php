<?php

namespace App\Modules\Hydration\Application;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class HydrationPhotoStorage
{
    public function save(?string $base64): array
    {
        if ($base64 === null) {
            return [];
        }
        $bytes = base64_decode($base64, true);
        $image = $bytes !== false ? @getimagesizefromstring($bytes) : false;
        $extensions = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (! $image || ! isset($extensions[$image['mime']]) || strlen($bytes) > 1350000
            || $image[0] < 32 || $image[1] < 32 || $image[0] > 4096 || $image[1] > 4096) {
            throw ValidationException::withMessages(['photo_base64' => ['Envie uma foto JPEG, PNG ou WebP de até 1,3 MB e 4096 pixels.']]);
        }
        $path = 'hydration/'.Str::uuid().'.'.$extensions[$image['mime']];
        if (! Storage::disk('local')->put($path, $bytes, 'private')) {
            throw new RuntimeException('Não foi possível guardar a foto. Tente novamente.');
        }

        return ['photo_path' => $path, 'photo_mime' => $image['mime']];
    }
}
