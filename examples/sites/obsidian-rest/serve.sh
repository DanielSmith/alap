#!/usr/bin/env bash
# Run the Obsidian REST example server.
#
# Prereqs:
#   1. `pnpm build` at repo root (needs dist/alap.iife.js and
#      dist/protocols/obsidian/).
#   2. Obsidian Local REST API plugin installed and running in your
#      vault (https://github.com/coddingtonbear/obsidian-local-rest-api).
#   3. ALAP_OBSIDIAN_REST_KEY set to the plugin's API key.
#
# Overrides: PORT, ALAP_OBSIDIAN_REST_HOST, ALAP_OBSIDIAN_REST_PORT,
#            ALAP_OBSIDIAN_REST_SCHEME, ALAP_OBSIDIAN_REST_KEY,
#            ALAP_OBSIDIAN_VAULT (display name for obsidian:// URIs).

set -euo pipefail
cd "$(dirname "$0")"
exec node server.mjs
