#!/usr/bin/env bash
# Explicit opt-in, whitelisted deletion of the three known legacy directories.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOWNLOADS="$(realpath "$HOME/Downloads")"
ARCHIVE="$HOME/game-hub-legacy-backups"
OLD=(go-online gomoku-online star-array-v0.1)
printf '\n旧工程安全清理器（仅限指定目录）\n'
printf '新的统一工程：%s\n' "$ROOT"
printf '备份目录：%s\n\n' "$ARCHIVE"
for name in "${OLD[@]}"; do
  p="$DOWNLOADS/$name"
  if [[ -d "$p" && ! -L "$p" ]]; then printf '待清理：%s\n' "$p"; fi
done
if [[ "${1:-}" != '--apply' ]];then
  printf '\n目前只是查看，不会删除。\n'
  printf '请先启动新大厅并确认账号与关卡可用，之后执行：\n  ./scripts/cleanup-old.sh --apply\n'
  exit 0
fi
# Do not cleanup if hub isn't running or backend services are unavailable.
PORT="${PORT:-3300}"
if ! curl --silent --fail "http://localhost:$PORT/api/health" >/dev/null;then
  echo '拒绝清理：新游戏大厅尚未运行。';exit 1
fi
if ! curl --silent --fail "http://localhost:$PORT/api/services" | grep -Eq '"go":true.*"gomoku":true';then
  echo '拒绝清理：围棋/五子棋服务器尚未就绪。';exit 1
fi
mkdir -p "$ARCHIVE" && chmod 700 "$ARCHIVE"
printf '\n会先将旧目录打包备份。需要输入精确确认文字：DELETE OLD GAMES\n'
read -r answer
if [[ "$answer" != 'DELETE OLD GAMES' ]];then echo '取消。';exit 0;fi
stamp="$(date +%Y%m%d-%H%M%S)"
for name in "${OLD[@]}";do
  old="$DOWNLOADS/$name"
  [[ -d "$old" && ! -L "$old" ]] || continue
  [[ "$(realpath "$old")" == "$DOWNLOADS/$name" ]] || { echo "跳过异常目录 $old";continue; }
  [[ "$old" != "$ROOT" ]] || { echo '拒绝删除新工程'; exit 1; }
  backup="$ARCHIVE/${name}-${stamp}.tar.gz"
  tar -C "$DOWNLOADS" -czf "$backup" "$name"
  tar -tzf "$backup" >/dev/null
  if [[ ! -s "$backup" ]];then echo "备份失败：$name";exit 1;fi
  rm -rf -- "$old"
  echo "已清理 $old（可从 $backup 恢复）"
done
printf '\n旧工程目录清理完毕，备份压缩包保留在 %s。\n' "$ARCHIVE"
printf '本脚本不会删除浏览器保存的数据、桌面其他目录或 ZIP 安装包。\n'
# Remove only outdated aliases that explicitly point to the whitelisted legacy app paths.
if [[ -f "$HOME/.bashrc" ]]; then
  cp -p "$HOME/.bashrc" "$ARCHIVE/bashrc-before-cleanup-$stamp.bak"
  python3 - "$HOME/.bashrc" <<'PYALIAS'
from pathlib import Path
import re,sys
p=Path(sys.argv[1]);lines=p.read_text().splitlines(keepends=True)
pattern=re.compile(r"^\s*alias\s+(?:weiqi|gomoku|star)=")
legacy=('go-online','gomoku-online','star-array-v0.1')
keep=[line for line in lines if not (pattern.match(line) and any(x in line for x in legacy))]
if len(keep)!=len(lines):
    p.write_text(''.join(keep))
    print('已清理旧游戏快捷命令。可运行 ./scripts/install-launcher.sh 配置新 games 命令。')
PYALIAS
fi
