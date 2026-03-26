#!/usr/bin/env bash
cd "$(dirname "$0")/../.." && npx vite --port 9020 --config ../vite.config.ts --open /sites/basic/
