#!/usr/bin/env bash
# SPDX-License-Identifier: Apache-2.0
#
# Serve the htmx example. Uses Python's built-in HTTP server
# since this is a zero-build, static-files-only example.
cd "$(dirname "$0")"
cp ../../../dist/alap.iife.js alap.iife.js 2>/dev/null
echo ""
echo "  Alap + htmx example"
echo "  http://localhost:9220/"
echo ""
python3 -m http.server 9220 --bind 127.0.0.1
