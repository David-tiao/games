#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -x .venv/bin/python ]]; then
  echo '请先运行: ./install.sh'
  exit 1
fi
MODE="${1:-hybrid}"
if [[ "$MODE" != 'hybrid' && "$MODE" != 'yolo' && "$MODE" != 'classical' ]]; then
  echo '使用方法: ./start.sh [hybrid|yolo|classical]'
  exit 1
fi
.venv/bin/python -u local_server.py --mode "$MODE" &
SERVER_PID=$!
cleanup(){ kill "$SERVER_PID" 2>/dev/null || true; wait "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
# Give the server process a moment to initialize before opening the browser.
sleep 1
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo '服务启动失败，查看上面的错误消息。'
  exit 1
fi
URL="http://127.0.0.1:8765/?v=4.1"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 || echo "请手动打开: $URL"
else
  echo "请用浏览器打开: $URL"
fi
printf '\n浏览器访问: %s\n默认单目标像素演示；点击「连接本机算法」或按 T 切换 YOLO/OpenCV + 多 ID MOT。Ctrl+C 停止服务。\n' "$URL"
wait "$SERVER_PID"
