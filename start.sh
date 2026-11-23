#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null || ! command -v npm >/dev/null;then echo '需要 Node.js >=20 和 npm。';exit 1;fi
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
GAME_PORT="${PORT:-3300}"
if command -v ss >/dev/null 2>&1 && ss -lnt "( sport = :$GAME_PORT )" | grep -q '^LISTEN';then
  echo "⚠ 游戏大厅端口 $GAME_PORT 已被占用。可先打开 http://localhost:$GAME_PORT 检查，或执行 PORT=3301 ./start.sh"
  exit 1
fi
if (( NODE_MAJOR < 20 ));then echo 'Node.js 版本过低，请升级到 20 或更新。';exit 1;fi
echo '🎮 六合一游戏大厅 V1.7 · 检查旧账号数据...'
./scripts/migrate-old.sh
./scripts/migrate-ball-weights.sh
for game in go-online gomoku-online;do
  base="apps/$game"
  # Reuse already installed original dependencies where possible, without retaining symlinks to the old directory.
  old_modules="$HOME/Downloads/$game/node_modules"
  if [[ ! -e "$base/node_modules" && -d "$old_modules" ]];then
    echo "♻️ 复用旧 $game 已安装的依赖（复制到新工程，不依赖旧目录）。"
    cp -a -- "$old_modules" "$base/node_modules"
  fi
  if ! (cd "$base/server" && node --input-type=module -e 'import("express").then(()=>{}).catch(()=>process.exit(1))') >/dev/null 2>&1 || \
     ! (cd "$base/client" && node -e 'require.resolve("vite")') >/dev/null 2>&1;then
    echo "📦 $game 需要安装依赖；第一次启动需联网。"
    npm install --prefix "$base" --no-audit --no-fund --prefer-offline --fetch-retries=1 --fetch-timeout=25000 || {
      echo "依赖安装失败。请联网后执行：cd $PWD/$base && npm install";exit 1;
    }
  fi
  echo "🔧 编译 $game..."
  npm run build --prefix "$base"
done
echo '✓ 构建成功。启动统一服务。'
exec node hub/server.mjs
