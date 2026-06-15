#!/bin/bash
set -e

ESBUILD="../node_modules/.bin/esbuild"

if [ ! -f "$ESBUILD" ]; then
  echo "esbuild not found at $ESBUILD — run 'npm install' in the project root first"
  exit 1
fi

mkdir -p dist

# Bundle each entry point into a self-contained script (no ES module imports at runtime)
"$ESBUILD" src/background.ts      --bundle --outfile=dist/background.js      --platform=browser --target=chrome100 --log-level=info
"$ESBUILD" src/content-nusw.ts    --bundle --outfile=dist/content-nusw.js    --platform=browser --target=chrome100 --log-level=info
"$ESBUILD" src/content-lever.ts   --bundle --outfile=dist/content-lever.js   --platform=browser --target=chrome100 --log-level=info
"$ESBUILD" src/content-greenhouse.ts --bundle --outfile=dist/content-greenhouse.js --platform=browser --target=chrome100 --log-level=info

cp manifest.json dist/
cp popup.html dist/
echo "Extension built to extension/dist/"
echo "Load extension/dist/ in Chrome at chrome://extensions (developer mode)"
