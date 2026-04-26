#!/usr/bin/env bash
# Run vite from the alap root with examples/sites as the project root,
# matching the `pnpm dev` script. That way absolute paths like
# /shared/styles.css resolve correctly (to examples/sites/shared/styles.css).
cd "$(dirname "$0")/../../.." && npx vite serve examples/sites --config vite.config.ts --port 9180 --open /hn/
