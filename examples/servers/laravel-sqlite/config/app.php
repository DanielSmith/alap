<?php

return [
    'name' => env('APP_NAME', 'AlapConfigServer'),
    'env' => env('APP_ENV', 'local'),
    'debug' => (bool) env('APP_DEBUG', true),
    'url' => env('APP_URL', 'http://localhost:8000'),
    'timezone' => 'UTC',
    'locale' => 'en',
    'key' => env('APP_KEY'),
    'cipher' => 'AES-256-CBC',

    'providers' => \Illuminate\Support\ServiceProvider::defaultProviders()->toArray(),
];
