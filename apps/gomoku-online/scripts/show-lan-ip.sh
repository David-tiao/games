#!/usr/bin/env bash
set -euo pipefail
echo "局域网 IPv4 地址："
hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+\.' || true
echo
echo "开发模式： http://<上面的IP>:5173"
echo "生产模式： http://<上面的IP>:3001"
