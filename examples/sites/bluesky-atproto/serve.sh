#!/usr/bin/env bash
cd "$(dirname "$0")/../.." && npx vite --port 9170 --config ../vite.config.ts --open /sites/bluesky-atproto/
