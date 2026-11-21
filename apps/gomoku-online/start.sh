#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "未找到 Node.js/npm。请先安装 Node.js 20+ 和 npm 10+。"
  exit 1
fi

if [ ! -d "$ROOT_DIR/node_modules" ]; then
  echo "首次运行：正在安装项目依赖..."
  npm install
fi

export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-3001}"

echo "正在构建手机/电脑通用版本..."
npm run build

LAN_IP="$(ip route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}')"
if [ -z "${LAN_IP:-}" ]; then
  LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
fi

echo
echo "五子棋 Online 已准备启动。"
echo "本机地址： http://localhost:${PORT}"
if [ -n "${LAN_IP:-}" ]; then
  echo "手机/电脑共用地址：http://${LAN_IP}:${PORT}"
fi
echo "同一 Wi-Fi 下的其他设备访问上面的共用地址。"
echo "停止服务：按 Ctrl + C"
echo

npm start
