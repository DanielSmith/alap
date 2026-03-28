<?php
// SPDX-License-Identifier: Apache-2.0
//
// WordPress configuration for SQLite (no MySQL/MariaDB required).
// Used by the Alap WordPress plugin demo and development setup.

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

// Authentication keys and salts.
// For local development and testing only.
// Generate fresh keys for production: https://api.wordpress.org/secret-key/1.1/salt/
define('AUTH_KEY',         'alap-dev-auth-key-1');
define('SECURE_AUTH_KEY',  'alap-dev-auth-key-2');
define('LOGGED_IN_KEY',    'alap-dev-auth-key-3');
define('NONCE_KEY',        'alap-dev-auth-key-4');
define('AUTH_SALT',        'alap-dev-salt-1');
define('SECURE_AUTH_SALT', 'alap-dev-salt-2');
define('LOGGED_IN_SALT',   'alap-dev-salt-3');
define('NONCE_SALT',       'alap-dev-salt-4');

$table_prefix = 'wp_';

define('WP_DEBUG', false);

if (!defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/');
}
require_once ABSPATH . 'wp-settings.php';
