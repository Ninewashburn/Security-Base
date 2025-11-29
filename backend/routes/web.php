<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

// Routes publiques (sans check.token)
Route::get('/login', [AuthController::class, 'redirectToSSO'])->name('login');

// Routes protégées par check.token
Route::middleware('check.token')->group(function () {
    
    Route::get('/logout', function () {
        session()->flush();
        return redirect('/');
    });
    
    Route::get('/auth/callback', function () {
        return redirect('/incidents');
    });
    
});

// Catch-all pour le SPA (sans middleware)
Route::fallback(function () {
    return file_get_contents(public_path('index.html'));
});