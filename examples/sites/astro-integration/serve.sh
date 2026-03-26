#!/usr/bin/env bash
cd "$(dirname "$0")"

echo ""
echo "  Astro integration example (IIFE mode for local dev)."
echo "  In production, use: npm install alap + the integration pattern."
echo "  See integrations/alap.mjs for the full ESM approach."
echo ""

[ ! -d node_modules ] && npm install

# Copy the IIFE build so Astro can serve it from public/
cp ../../../dist/alap.iife.js public/alap.iife.js

./node_modules/.bin/astro dev --port 9010
