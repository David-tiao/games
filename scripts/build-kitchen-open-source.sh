#!/usr/bin/env bash
set -euo pipefail
# Adapter for MIT-licensed original Taste from Another Place 2D C++ cooking game.
ROOT="$(cd -- "$(dirname -- "$0")/.." && pwd)"
UP="$ROOT/apps/kitchen-chaos/vendor/taste-from-another-place"
PIN="b1f262c951ce57a5af252b059557c0db0a6ef839"
CACHE="$ROOT/apps/kitchen-chaos/.cache"
mkdir -p "$CACHE"

for tool in git cmake make em++ emcmake emmake; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "[kitchen] Missing tool: $tool" >&2
    echo "Install Emscripten: https://emscripten.org/docs/getting_started/downloads.html" >&2
    exit 2
  fi
done
if [[ ! -f "$UP/LICENSE" || ! -f "$UP/src/main.cpp" ]]; then
  echo "[kitchen] Original MIT source missing. Run git pull first." >&2
  exit 2
fi
# Original media is NOT republished in games. Fetch exactly the pinned source.
if [[ ! -f "$UP/assets/music/theme_start.mp3" || ! -f "$UP/assets/music/theme_loop.mp3" ]]; then
  echo "[kitchen] Fetching original media at pinned upstream commit..."
  TEMP="$(mktemp -d)"
  trap 'rm -rf "$TEMP"' EXIT
  git -C "$TEMP" init -q
  git -C "$TEMP" remote add origin https://github.com/mikegiannako/taste-from-another-place.git
  git -C "$TEMP" fetch --depth 1 origin "$PIN"
  ACTUAL="$(git -C "$TEMP" rev-parse FETCH_HEAD)"
  if [[ "$ACTUAL" != "$PIN" ]]; then echo "Upstream SHA mismatch" >&2; exit 1; fi
  # Fetch populates FETCH_HEAD only; checkout is required to materialize assets/.
  git -C "$TEMP" checkout -q --detach FETCH_HEAD
  test -d "$TEMP/assets" || { echo "[kitchen] Upstream assets missing" >&2; exit 1; }
  rm -rf "$UP/assets"
  cp -a "$TEMP/assets" "$UP/assets"
  rm -rf "$TEMP"
  trap - EXIT
fi
# Build upstream raylib zlib-licensed library for Emscripten.
RAYLIB="$CACHE/raylib"
if [[ ! -f "$RAYLIB/CMakeLists.txt" ]]; then
  git clone --depth 1 --branch 5.5 https://github.com/raysan5/raylib.git "$RAYLIB"
fi
LIBRARY="$RAYLIB/build-web/raylib/libraylib.a"
if [[ ! -s "$LIBRARY" ]]; then
  emcmake cmake -S "$RAYLIB" -B "$RAYLIB/build-web" \
    -DPLATFORM=Web -DCMAKE_BUILD_TYPE=Release -DBUILD_EXAMPLES=OFF -DBUILD_GAMES=OFF
  emmake cmake --build "$RAYLIB/build-web" --parallel
fi
if [[ ! -s "$LIBRARY" ]]; then echo "Raylib build failed: $LIBRARY" >&2; exit 1; fi

echo "[kitchen] Building the unmodified upstream 2D cooking game..."
make -C "$UP" build-web \
  "EMCC=$(command -v em++)" \
  "RAYLIB_INC=$RAYLIB/src" \
  "RAYLIB_LIB=$LIBRARY"
if [[ ! -s "$UP/web/index.html" || ! -s "$UP/web/index.js" || ! -s "$UP/web/index.wasm" ]]; then
  echo "[kitchen] Expected WebAssembly output is missing. Read build log." >&2; exit 1
fi
echo "MIT upstream game is ready: http://localhost:3300/play/kitchen/upstream/"
