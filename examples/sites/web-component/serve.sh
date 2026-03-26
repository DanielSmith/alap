#!/usr/bin/env bash
cd "$(dirname "$0")/../.." && npx vite --port 9120 --config ../vite.config.ts --open /sites/web-component/
