#!/bin/bash
# SPDX-License-Identifier: Apache-2.0
#
# Alap instant demo — WordPress with pre-seeded content.
# Single container, SQLite, no setup wizard.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PARENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Copy the IIFE build into the plugin directory
cp "$REPO_ROOT/dist/alap.iife.js" "$PARENT_DIR/alap.iife.js"

echo "Alap WordPress demo running at http://localhost:8090"
echo "  Admin: http://localhost:8090/wp-admin (demo / demo)"
echo ""
echo "Stop with: podman compose -f $SCRIPT_DIR/docker-compose.yml down"
echo ""

cd "$SCRIPT_DIR"
podman compose up --build
