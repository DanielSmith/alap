<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Composer autoloader (local to this project)
require __DIR__ . '/../vendor/autoload.php';

// Bootstrap the application
$app = require_once __DIR__ . '/../bootstrap/app.php';

// Handle the incoming request
$app->handleRequest(Request::capture());
