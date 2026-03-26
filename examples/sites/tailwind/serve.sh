#!/usr/bin/env bash
cd "$(dirname "$0")/../.." && npx vite --port 9100 --config ../vite.config.ts --open /sites/tailwind/
