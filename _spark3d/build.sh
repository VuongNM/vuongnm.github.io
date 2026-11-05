#!/bin/bash
# Bundles scene.js (three.js + bloom) into ../spark/spark3d.js, the WebGL layer of the landing page.
#   bash _spark3d/build.sh
# Needs Node + network once; three and esbuild are pinned and installed in a temp folder.
set -euo pipefail
cd "$(dirname "$0")"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
( cd "$work" && npm init -y >/dev/null && npm i --silent three@0.187.0 esbuild@0.28.2 )
cp scene.js "$work/scene.js"
( cd "$work" && ./node_modules/.bin/esbuild scene.js --bundle --minify --format=esm --target=es2020 --legal-comments=none --outfile=out.js )
cp "$work/out.js" ../spark/spark3d.js
echo "spark/spark3d.js: $(wc -c < ../spark/spark3d.js | tr -d ' ') bytes"
