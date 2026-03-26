#!/usr/bin/env bash
cd "$(dirname "$0")/../.." && npx vite --port 9160 --config ../vite.config.ts --open /sites/external-data/
