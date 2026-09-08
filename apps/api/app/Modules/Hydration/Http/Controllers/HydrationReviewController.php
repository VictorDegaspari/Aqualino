<?php

namespace App\Modules\Hydration\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Hydration\Application\HydrationReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class HydrationReviewController extends Controller
{
    public function __construct(private readonly HydrationReviewService $reviews) {}

    public function index(Request $request): JsonResponse
    {
        $page = $this->reviews->forUser($request->user());

        return response()->json(['data' => collect($page->items())->map(fn ($log) => $this->reviews->payload($log, $request->user())), 'meta' => [
            'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total(),
        ]]);
    }

    public function store(Request $request, string $logId): JsonResponse
    {
        $input = $request->validate(['vote' => ['required', Rule::in(['valid', 'invalid'])]]);

        return response()->json(['data' => $this->reviews->vote($request->user(), $logId, $input['vote'] === 'valid')]);
    }

    public function photo(Request $request, string $logId): StreamedResponse
    {
        $log = $this->reviews->findVisible($request->user(), $logId);
        abort_unless($log->photo_path && Storage::disk('local')->exists($log->photo_path), 404);

        return Storage::disk('local')->response($log->photo_path, 'copo', [
            'Content-Type' => $log->photo_mime, 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
