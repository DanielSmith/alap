#!/usr/bin/env bash
cd "$(dirname "$0")/../.." && npx vite --port 9090 --config ../vite.config.ts --open /sites/svelte/
