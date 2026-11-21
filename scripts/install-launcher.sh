#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$HOME/.local/bin"
cat > "$HOME/.local/bin/games" <<END
#!/usr/bin/env bash
cd "$ROOT"
exec ./start.sh "\$@"
END
chmod +x "$HOME/.local/bin/games"
echo '已安装游戏大厅启动命令：games'
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]];then
 echo '提示：当前 PATH 不包含 ~/.local/bin，可先打开新终端再运行 games。'
fi
