#!/usr/bin/env bash
# Run the Obsidian example server.
#
# Prereq: `pnpm build` at repo root (needs dist/alap.iife.js and
# dist/protocols/obsidian/).
#
# Overrides: PORT, ALAP_OBSIDIAN_VAULT, ALAP_OBSIDIAN_VAULT_NAME.

set -euo pipefail
cd "$(dirname "$0")"
exec node server.mjs
