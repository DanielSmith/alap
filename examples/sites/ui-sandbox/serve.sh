#!/bin/sh
cd "$(dirname "$0")/.."
npx vite --port 9300 --config vite.config.ts --open /ui-sandbox/
