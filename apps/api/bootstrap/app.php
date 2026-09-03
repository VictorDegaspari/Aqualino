<?php

use App\Modules\Inventory\Domain\PotionUseException;
use App\Shared\Http\ApiResponse;
use App\Shared\Http\Middleware\AssignRequestId;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend(AssignRequestId::class);
        $middleware->redirectGuestsTo(null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(fn (ValidationException $exception, Request $request) => ApiResponse::error(
            $request,
            'VALIDATION_FAILED',
            'Os dados informados são inválidos.',
            422,
            $exception->errors(),
        )
        );

        $exceptions->render(fn (AuthenticationException $exception, Request $request) => ApiResponse::error($request, 'AUTHENTICATION_REQUIRED', 'Autenticação necessária.', 401)
        );

        $exceptions->render(fn (ModelNotFoundException $exception, Request $request) => ApiResponse::error($request, 'RESOURCE_NOT_FOUND', 'Recurso não encontrado.', 404)
        );

        $exceptions->render(fn (PotionUseException $exception, Request $request) => ApiResponse::error(
            $request,
            $exception->errorCode,
            $exception->getMessage(),
            $exception->status,
        ));
    })->create();
