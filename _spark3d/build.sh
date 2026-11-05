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
( cd "$work" && ./node_modules/.bin/esbuild scene.js --bundle --minify --format=esm --target=es2020 --legal-comments=none --banner:js='/* three.js r187, MIT License, Copyright 2010-2025 three.js authors: https://github.com/mrdoob/three.js */' --outfile=out.js )
cp "$work/out.js" ../spark/spark3d.js
h=$(shasum -a 256 ../spark/spark3d.js | cut -c1-8)
perl -pi -e "s#spark3d\.js\?v=[A-Za-z0-9]+#spark3d.js?v=$h#g" ../spark/index.html
echo "spark/spark3d.js: $(wc -c < ../spark/spark3d.js | tr -d ' ') bytes, v=$h"
