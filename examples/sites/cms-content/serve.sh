#!/usr/bin/env bash
cd "$(dirname "$0")/../.." && npx vite --port 9200 --config ../vite.config.ts --open /sites/cms-content/
