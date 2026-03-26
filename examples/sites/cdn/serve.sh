#!/usr/bin/env bash
cd "$(dirname "$0")"
cp ../../../dist/alap.iife.js alap.iife.js
echo ""
echo "  http://localhost:9130/"
echo ""
python3 -m http.server 9130 --bind 127.0.0.1
