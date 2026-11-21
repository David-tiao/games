#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOWNLOADS="${HOME}/Downloads"
mkdir -p "$ROOT/data/migration-logs"
log="$ROOT/data/migration-logs/migrate-$(date +%Y%m%d).log"
printf '检查旧游戏账号数据（仅复制，不删除或覆盖）…\n' | tee -a "$log"
for item in 'go-online:go-online' 'gomoku-online:gomoku-online'; do
  name="${item%%:*}"; dest="${item##*:}"
  src="$DOWNLOADS/$name/server/data"
  target="$ROOT/apps/$dest/server/data"
  mkdir -p "$target"
  if [[ -d "$src" && "$(realpath "$src")" != "$(realpath "$target")" ]]; then
    while IFS= read -r -d '' file; do
      relative="${file#"$src"/}"
      mkdir -p "$(dirname "$target/$relative")"
      if [[ ! -e "$target/$relative" ]]; then
        cp -p -- "$file" "$target/$relative"
        printf '已复制 %s 数据：%s\n' "$name" "$relative" | tee -a "$log"
      fi
    done < <(find "$src" -type f -print0)
  fi
done
printf '账号数据迁移检查完成。旧目录未改动。\n' | tee -a "$log"
