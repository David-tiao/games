# Kitchen Chaos Lab — upstream game integration

**Integration status:** imported original MIT-licensed 2D cooking game C++ source; WebAssembly and assets need building on your Linux computer. Until built, the route shows setup instructions rather than pretending the game is playable.

## Reused upstream (not a reimplementation)
- **Taste from Another Place**: https://github.com/mikegiannako/taste-from-another-place
- Pinned commit: `b1f262c951ce57a5af252b059557c0db0a6ef839`.
- MIT license in `vendor/taste-from-another-place/LICENSE`, copyright (c) 2026 Art3mis. Keep the license and copyright attribution.
- Copied directly: 30 original text files including `src/*.cpp`, `src/*.h`, Makefile, web shell, LICENSE and README.
- This existing game already implements an overhead kitchen, customers, orders, cutting and drink minigames, frying and grilling.
- **Upstream is single-player**. The previously designed local co-op, multiplayer and AI kitchen are future adaptations, not implemented features.

## Run on Linux
Install Emscripten SDK so `em++`, `emcmake`, `emmake` work, plus `git`, `cmake`, `make`. Then from the root of `games`:
```bash
bash scripts/build-kitchen-open-source.sh
./start.sh
```
Open `http://localhost:3300/play/kitchen/`.

The build script fetches the original pinned revision's media to your local computer because the current GitHub connection cannot transfer two large music files. It downloads raylib and compiles the original game; it does **not** recreate gameplay systems. Media are excluded from this repository pending separate verification of third-party art/audio rights; preserve upstream credits and audit before redistribution.

## Credit / licensing
Original game authors and artwork contributors are listed in `vendor/taste-from-another-place/README.md`. Their repository LICENSE is MIT for the software; other media may have independent licensing. Raylib itself uses the zlib license. The whole `games` repository is not thereby relicensed.
