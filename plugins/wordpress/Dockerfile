# SPDX-License-Identifier: Apache-2.0
#
# WordPress + SQLite (no MySQL/MariaDB required).
# Uses the WP Performance Team's SQLite Database Integration plugin.
# https://github.com/WordPress/sqlite-database-integration

# wordpress:6.7-php8.3-apache
FROM wordpress:6.7-php8.3-apache@sha256:10f35d0dd608ee9f907c22aa3f2bbb9ac64fee72726503e53f2afd298d2a09f1

# Install the SQLite Database Integration plugin (WP Performance Team).
# Download the release zip, extract to the plugins directory, and place
# the db.php drop-in so WordPress uses SQLite instead of MySQL.
#
# Files go into /usr/src/wordpress/ because the WordPress entrypoint
# copies from there into /var/www/html/ at container start.
ARG SQLITE_VERSION=2.2.20
RUN apt-get update && apt-get install -y unzip \
    && curl -sL "https://github.com/WordPress/sqlite-database-integration/archive/refs/tags/v${SQLITE_VERSION}.zip" \
       -o /tmp/sqlite.zip \
    && unzip -q /tmp/sqlite.zip -d /tmp/sqlite \
    && mv /tmp/sqlite/sqlite-database-integration-${SQLITE_VERSION} \
       /usr/src/wordpress/wp-content/plugins/sqlite-database-integration \
    && cp /usr/src/wordpress/wp-content/plugins/sqlite-database-integration/db.copy \
       /usr/src/wordpress/wp-content/db.php \
    && rm -rf /tmp/sqlite.zip /tmp/sqlite \
    && apt-get purge -y unzip && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# WordPress config for SQLite
COPY seed/wp-config.php /usr/src/wordpress/wp-config.php

# Database directory (SQLite file created here on first boot)
RUN mkdir -p /usr/src/wordpress/wp-content/database

# Alap plugin
COPY alap.php /usr/src/wordpress/wp-content/plugins/alap/alap.php
COPY alap-config.js /usr/src/wordpress/wp-content/plugins/alap/alap-config.js
COPY alap.iife.js /usr/src/wordpress/wp-content/plugins/alap/alap.iife.js

EXPOSE 80
