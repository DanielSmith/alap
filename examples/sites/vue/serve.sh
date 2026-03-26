#!/usr/bin/env bash
cd "$(dirname "$0")/../.." && npx vite --port 9110 --config ../vite.config.ts --open /sites/vue/
