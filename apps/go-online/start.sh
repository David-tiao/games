#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  echo "请先安装 Node.js 20+ 和 npm 10+。"; exit 1
fi
if [ ! -d node_modules ]; then
  echo "首次安装项目依赖..."
  npm install
fi
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-3100}"
echo "构建围棋学堂 V4.5.1 网页（50课 + 方法论 + 算法实验室 + 双语）..."
npm run build
LAN_IP="$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++)if($i=="src"){print $(i+1);exit}}' || true)"
if [ -z "$LAN_IP" ]; then LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"; fi
echo "-------------------------------------"
echo "围棋学堂 Online V4.5.1 启动中（单端口 ${PORT}）"
echo "本机访问：http://localhost:${PORT}"
if [ -n "$LAN_IP" ]; then echo "手机与电脑共用：http://${LAN_IP}:${PORT}"; fi
echo "真人对局：与朋友同一局域网、使用不同账号。
教学人机：不需要账号；无真人加入时可自动进入 AI 练习。"
echo "Ctrl+C 停止。"
echo "-------------------------------------"
exec npm start
