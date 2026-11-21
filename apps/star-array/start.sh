#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo '需要 Node.js 20 或更高版本。请先安装 Node.js。'
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if (( NODE_MAJOR < 20 )); then
  echo 'Node.js 版本过低，需要 20 或更高版本。'; exit 1
fi
PORT="${PORT:-3200}"
if command -v ss >/dev/null 2>&1 && ss -ltn "( sport = :$PORT )" | grep -q LISTEN; then
  echo "提示：端口 $PORT 正在被使用。请关闭旧服务，或执行 PORT=3201 ./start.sh"
  exit 1
fi
printf '\n\033[1;36m✦ 星阵：共振计划 V0.1\033[0m\n'
printf '本机: http://localhost:%s\n' "$PORT"
LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
if [[ -n "$LAN_IP" ]]; then printf '局域网预览: http://%s:%s\n' "$LAN_IP" "$PORT"; fi
printf '这是单人核心原型；十人协作尚未实现。\n\n'
export PORT
node server/index.js
