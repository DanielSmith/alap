<?php
// SPDX-License-Identifier: Apache-2.0
//
// WordPress configuration for the Alap instant demo.
// Pre-seeded SQLite database, no setup wizard needed.

// SQLite database location
define('DB_DIR', '/var/www/html/wp-content/database');
define('DB_FILE', '.ht.sqlite');

// These are unused with SQLite but WordPress requires them to be defined.
define('DB_NAME', 'wordpress');
define('DB_USER', '');
define('DB_PASSWORD', '');
define('DB_HOST', '');
define('DB_CHARSET', 'utf8');
define('DB_COLLATE', '');

// Demo site URL
define('WP_HOME', 'http://localhost:8090');
define('WP_SITEURL', 'http://localhost:8090');

// Lock down the demo — no file editing from admin
define('DISALLOW_FILE_EDIT', true);

// Authentication keys and salts (demo only — not for production).
define('AUTH_KEY',         'alap-demo-key-1');
define('SECURE_AUTH_KEY',  'alap-demo-key-2');
define('LOGGED_IN_KEY',    'alap-demo-key-3');
define('NONCE_KEY',        'alap-demo-key-4');
define('AUTH_SALT',        'alap-demo-salt-1');
define('SECURE_AUTH_SALT', 'alap-demo-salt-2');
define('LOGGED_IN_SALT',   'alap-demo-salt-3');
define('NONCE_SALT',       'alap-demo-salt-4');

$table_prefix = 'wp_';

define('WP_DEBUG', false);

if (!defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/');
}
require_once ABSPATH . 'wp-settings.php';
