#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source_dir="$HOME/Downloads/neon_ball_lab/runs/ball_yolo/weights"
dest_dir="$ROOT/apps/neon-ball-lab/runs/ball_yolo/weights"
if [[ -d "$source_dir" && "$(realpath "$source_dir")" != "$(realpath -m "$dest_dir")" ]];then
  mkdir -p "$dest_dir"
  for file in "$source_dir"/*.pt;do
    [[ -f "$file" ]] || continue
    target="$dest_dir/$(basename "$file")"
    if [[ ! -e "$target" ]];then
      cp -p -- "$file" "$target"
      echo "已复制训练权重（不覆盖）：$(basename "$file")"
    fi
  done
fi
