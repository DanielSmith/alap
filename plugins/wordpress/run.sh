#!/bin/bash
# SPDX-License-Identifier: Apache-2.0
#
# Start WordPress with SQLite and the Alap plugin.
# Single container, no MySQL/MariaDB required.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Copy the IIFE build into the plugin directory
cp "$REPO_ROOT/dist/alap.iife.js" "$SCRIPT_DIR/alap.iife.js"

# Ask about persistence
COMPOSE_FILES="-f $SCRIPT_DIR/docker-compose.yml"
printf "Persist database across restarts? [y/N] "
read -r PERSIST
if [ "$PERSIST" = "y" ] || [ "$PERSIST" = "Y" ]; then
    COMPOSE_FILES="$COMPOSE_FILES -f $SCRIPT_DIR/docker-compose.persist.yml"
    echo "  Database will persist in a Docker volume."
else
    echo "  Ephemeral mode — database resets on each build."
fi

echo ""
echo "Starting WordPress (SQLite) with Alap plugin..."
echo "  http://localhost:8080"
echo ""
echo "Complete the install wizard, then activate 'Alap' in Plugins."
echo "Use [alap query=\".coffee\"]text[/alap] in any post or page."
echo ""
echo "Stop with: podman compose $COMPOSE_FILES down"
echo ""

cd "$SCRIPT_DIR"
podman compose $COMPOSE_FILES up --build
