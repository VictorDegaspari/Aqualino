<?php

use App\Modules\Identity\Http\Controllers\AccountSecurityController;
use Illuminate\Support\Facades\Route;

Route::get('/reset-password', [AccountSecurityController::class, 'resetPage'])->name('password.reset');
Route::get('/email/verify/{id}/{hash}', [AccountSecurityController::class, 'verifyEmail'])
    ->middleware('throttle:30,1')->name('verification.verify');

Route::get('/', function () {
    return view('welcome');
});
