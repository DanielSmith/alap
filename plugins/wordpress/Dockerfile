# SPDX-License-Identifier: Apache-2.0
#
# WordPress + SQLite (no MySQL/MariaDB required).
# Uses the WP Performance Team's SQLite Database Integration plugin.
# https://github.com/WordPress/sqlite-database-integration

FROM wordpress:latest

# Install the SQLite Database Integration plugin (WP Performance Team).
# Download the release zip, extract to the plugins directory, and place
# the db.php drop-in so WordPress uses SQLite instead of MySQL.
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

# WordPress config for SQLite
COPY seed/wp-config.php /var/www/html/wp-config.php

# Database directory (SQLite file created here on first boot)
RUN mkdir -p /var/www/html/wp-content/database \
    && chown -R www-data:www-data /var/www/html/wp-content/database

# Alap plugin
COPY alap.php /var/www/html/wp-content/plugins/alap/alap.php
COPY alap-config.js /var/www/html/wp-content/plugins/alap/alap-config.js
COPY alap.iife.js /var/www/html/wp-content/plugins/alap/alap.iife.js

EXPOSE 80
