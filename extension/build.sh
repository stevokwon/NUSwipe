#!/bin/bash
set -e
mkdir -p dist
npx tsc --project tsconfig.json
cp manifest.json dist/
echo "Extension built to extension/dist/"
echo "Load extension/dist/ in Chrome at chrome://extensions (developer mode)"
