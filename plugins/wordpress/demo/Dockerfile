# SPDX-License-Identifier: Apache-2.0
#
# Alap instant demo — WordPress + SQLite, pre-seeded.
# No setup wizard, no activation step. Just boot and browse.
# https://github.com/WordPress/sqlite-database-integration
#
# Build context must be the parent directory (plugins/wordpress/).
# See docker-compose.yml for the context/dockerfile configuration.

# wordpress:6.7-php8.3-apache
FROM wordpress:6.7-php8.3-apache@sha256:10f35d0dd608ee9f907c22aa3f2bbb9ac64fee72726503e53f2afd298d2a09f1

# Install the SQLite Database Integration plugin (WP Performance Team).
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

# Pre-seeded SQLite database (WordPress installed, Alap active, demo content)
RUN mkdir -p /usr/src/wordpress/wp-content/database
COPY demo/seed/.ht.sqlite /usr/src/wordpress/wp-content/database/.ht.sqlite

# WordPress config for SQLite
COPY demo/seed/wp-config.php /usr/src/wordpress/wp-config.php

# Alap plugin (from parent context)
COPY alap.php /usr/src/wordpress/wp-content/plugins/alap/alap.php
COPY alap-config.js /usr/src/wordpress/wp-content/plugins/alap/alap-config.js
COPY alap.iife.js /usr/src/wordpress/wp-content/plugins/alap/alap.iife.js

EXPOSE 80
