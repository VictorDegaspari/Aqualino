<?php

namespace App\Shared\Http;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ApiResponse
{
    public static function error(
        Request $request,
        string $code,
        string $message,
        int $status,
        array $fields = [],
    ): JsonResponse {
        return response()->json([
            'error' => [
                'code' => $code,
                'message' => $message,
                'fields' => (object) $fields,
                'request_id' => $request->attributes->get('request_id'),
            ],
        ], $status);
    }
}
