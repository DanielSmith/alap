#!/usr/bin/env bash
cd "$(dirname "$0")/../.." && npx vite --port 9000 --config ../vite.config.ts --open /sites/alpine/
