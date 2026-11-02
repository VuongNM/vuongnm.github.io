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

# Spark phải thoát hẳn rồi mới thay app, nếu không macOS sẽ không mở được bản mới.
running() { pgrep -qf "$APP/Contents/MacOS/Spark"; }
wait_quit() { for _ in $(seq "$1"); do running || return 0; sleep 0.2; done; ! running; }
if running; then
  osascript -e "quit app id \"$ID\"" >/dev/null 2>&1 || true
  wait_quit 50 || { pkill -TERM -f "$APP/Contents/MacOS/Spark" || true; wait_quit 25; } || {
    echo "Spark chưa thoát được. Bấm Thoát Spark trên menu bar rồi chạy lại lệnh này."
    exit 1
  }
fi
rm -rf "$APP"
ditto "$tmp/Spark.app" "$APP"

echo "Đã cài vào $APP. Đang mở Spark…"
# Ngay sau khi thay app, macOS có thể cần thêm một chút mới mở được.
for _ in 1 2 3 4 5; do open "$APP" 2>/dev/null && exit 0; sleep 1; done
echo "Chưa mở được Spark. Mở Spark trong thư mục Applications."
