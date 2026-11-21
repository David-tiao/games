#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LAB="$ROOT/apps/neon-ball-lab"
PYTHON="${PYTHON:-python3}"
command -v "$PYTHON" >/dev/null || { echo '没有找到 python3；请先安装 python3 python3-venv'; exit 1; }
"$PYTHON" -m venv "$LAB/.venv" || { echo '创建 Python 虚拟环境失败，请安装 python3-venv'; exit 1; }
"$LAB/.venv/bin/python" -m pip install 'numpy>=1.26,<3' 'opencv-python-headless>=4.8' 'scipy>=1.11,<2'
"$LAB/.venv/bin/python" -c 'import numpy, cv2, scipy; print("✓ OpenCV + Kalman + MOT dependencies ready")'
printf '\n✅ 已安装真实本机追踪依赖。先按 Ctrl+C 停止 games，再重新执行 games。\n'
printf '默认使用经典视觉检测。训练出 YOLO 权重并安装 ultralytics 后可使用混合模式。\n'
