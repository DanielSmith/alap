# SPDX-License-Identifier: Apache-2.0
#
# Alap instant demo — WordPress + SQLite, pre-seeded.
# No setup wizard, no activation step. Just boot and browse.
# https://github.com/WordPress/sqlite-database-integration
#
# Build context must be the parent directory (plugins/wordpress/).
# See docker-compose.yml for the context/dockerfile configuration.

FROM wordpress:latest

# Install the SQLite Database Integration plugin (WP Performance Team).
ARG SQLITE_VERSION=2.2.20
RUN apt-get update && apt-get install -y unzip \
    && curl -sL "https://github.com/WordPress/sqlite-database-integration/archive/refs/tags/v${SQLITE_VERSION}.zip" \
       -o /tmp/sqlite.zip \
    && unzip -q /tmp/sqlite.zip -d /tmp/sqlite \
    && mv /tmp/sqlite/sqlite-database-integration-${SQLITE_VERSION} \
       /var/www/html/wp-content/plugins/sqlite-database-integration \
    && cp /var/www/html/wp-content/plugins/sqlite-database-integration/db.copy \
       /var/www/html/wp-content/db.php \
    && rm -rf /tmp/sqlite.zip /tmp/sqlite \
    && apt-get purge -y unzip && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Pre-seeded SQLite database (WordPress installed, Alap active, demo content)
RUN mkdir -p /var/www/html/wp-content/database
COPY demo/seed/.ht.sqlite /var/www/html/wp-content/database/.ht.sqlite
RUN chown -R www-data:www-data /var/www/html/wp-content/database

# WordPress config for SQLite
COPY demo/seed/wp-config.php /var/www/html/wp-config.php

# Alap plugin (from parent context)
COPY alap.php /var/www/html/wp-content/plugins/alap/alap.php
COPY alap-config.js /var/www/html/wp-content/plugins/alap/alap-config.js
COPY alap.iife.js /var/www/html/wp-content/plugins/alap/alap.iife.js

EXPOSE 80
