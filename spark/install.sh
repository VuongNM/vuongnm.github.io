#!/bin/bash
# Cài Spark vào /Applications.
#   curl -fsSL https://vuongnm.github.io/spark/install.sh | bash
# Tải bản mới nhất từ https://github.com/VuongNM/spark/releases, chép vào /Applications rồi mở.
# Chạy lại để cập nhật.
set -euo pipefail

URL="https://github.com/VuongNM/spark/releases/latest/download/Spark-mac-arm64.zip"
APP="/Applications/Spark.app"
ID="vn.vuongnm.spark"

[ "$(uname -s)" = Darwin ] || { echo "Script này dành cho macOS. Bản Windows: https://vuongnm.github.io/spark/"; exit 1; }
[ "$(uname -m)" = arm64 ] || { echo "Spark hiện chỉ chạy trên Mac chip Apple (M1 trở lên)."; exit 1; }

# Readdle cũng có một app tên Spark. Không bao giờ ghi đè app của người khác.
if [ -e "$APP" ]; then
  have=$(defaults read "$APP/Contents/Info" CFBundleIdentifier 2>/dev/null || true)
  if [ "$have" != "$ID" ]; then
    echo "Đã có một app khác ở $APP (${have:-không rõ}). Spark dừng lại, không ghi đè."
    exit 1
  fi
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

echo "Đang tải Spark…"
curl -fL --progress-bar "$URL" -o "$tmp/Spark.zip"
ditto -x -k "$tmp/Spark.zip" "$tmp"

if pgrep -qf "$APP/Contents/MacOS/Spark"; then
  osascript -e "quit app id \"$ID\"" >/dev/null 2>&1 || true
  sleep 1
fi
rm -rf "$APP"
ditto "$tmp/Spark.app" "$APP"

echo "Đã cài vào $APP. Đang mở Spark…"
open "$APP"
