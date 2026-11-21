#!/usr/bin/env bash
set -euo pipefail
IP="$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++)if($i=="src"){print $(i+1);exit}}' || true)"
if [ -z "$IP" ]; then IP="$(hostname -I | awk '{print $1}')"; fi
printf '请在电脑和手机中使用同一个地址： http://%s:3100\n' "$IP"
