#!/usr/bin/env bash
cd "$(dirname "$0")/../.." && npx vite --port 9040 --config ../vite.config.ts --open /sites/markdown/
