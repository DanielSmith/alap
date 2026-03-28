#!/bin/bash
# SPDX-License-Identifier: Apache-2.0
#
# Alap + Hugo example.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Copy the IIFE build into static/js/
cp "$REPO_ROOT/dist/alap.iife.js" "$SCRIPT_DIR/static/js/alap.iife.js"

echo "Alap + Hugo example running at http://localhost:9170"
echo ""
echo "Stop with: podman compose -f $SCRIPT_DIR/docker-compose.yml down"
echo ""

cd "$SCRIPT_DIR"
podman compose up --build
