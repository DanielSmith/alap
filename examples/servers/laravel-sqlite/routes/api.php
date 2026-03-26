<?php

use App\Http\Controllers\ConfigController;
use Illuminate\Support\Facades\Route;

Route::get('/configs', [ConfigController::class, 'index']);
Route::get('/configs/{name}', [ConfigController::class, 'show']);
Route::put('/configs/{name}', [ConfigController::class, 'update']);
Route::delete('/configs/{name}', [ConfigController::class, 'destroy']);

Route::get('/search', [ConfigController::class, 'search']);
Route::post('/cherry-pick', [ConfigController::class, 'cherryPick']);
Route::post('/query', [ConfigController::class, 'query']);
