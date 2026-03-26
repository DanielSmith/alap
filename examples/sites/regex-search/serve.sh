#!/usr/bin/env bash
cd "$(dirname "$0")/../.." && npx vite --port 9060 --config ../vite.config.ts --open /sites/regex-search/
