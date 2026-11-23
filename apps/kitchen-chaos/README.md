# Kitchen Chaos Lab — playable original co-op browser game

**Status: a playable original 2D cooking game is now included.** This folder also preserves an independent MIT-licensed C++/raylib single-player upstream port. They are separate implementations, with independent gameplay code.

## Play now (no WebAssembly or build step needed)

From the root of the [games repository](https://github.com/David-tiao/games), with Node.js >=20:

    npm start

Then open **http://localhost:3300/play/kitchen/**. The 7th game card in the hub opens this game.

You can also run a simple static server in this folder:

    cd apps/kitchen-chaos
    python3 -m http.server 8080

Then open http://localhost:8080/ . Use a server rather than file:// because gameplay imports an ES module.

### Original browser game (v0.1)

- 2D top-down 16×11 kitchen with movement and collision.
- **Solo or two players on the same keyboard**, 150-second shift.
- Lettuce/tomato salad and mushroom/onion soup, with different cooking dependencies.
- Pick up ingredients, hold a chopping key for 2 seconds, cook soup for 6 seconds (it can burn), plate, serve.
- Two boards, two stoves, assembly table, transfer counter, service bell and trash.
- Timed orders, fast-service bonus, combos, penalties, end-of-round summary.
- Touch controls for **solo** on phones and tablets; best played in landscape.
- Deterministic core rules in shared/engine.mjs, separate from Canvas, with automated tests.
- No online multiplayer or AI teammates yet; local two-player uses a shared keyboard.

#### Controls

| Action | Player 1 | Player 2 |
| --- | --- | --- |
| Move | W / A / S / D | Arrow keys |
| Face station, take/place/interact | E | Enter |
| Chop (hold while facing board) | Space | Right Shift |
| Pause | P | P |

Face the station from an **adjacent walkable tile**. Salad: take a plate, place it on the ⭐ assembly table, chop lettuce and tomato at the boards, add both to the plate, take the completed salad and serve at 🔔. Soup: chop mushroom + onion, add both to the same stove, cook for 6 seconds, pick up before it burns, add to a clean plate at ⭐, serve.

### Develop & test

At the repository root:

    node --test tests/kitchen-engine.test.mjs tests/kitchen-upstream.test.mjs
    npm run check

Files:
- index.html, style.css, game.js: original playable browser interface and canvas.
- shared/engine.mjs: kitchen rules, recipes, tickets, state machines, collisions and scoring.
- vendor/taste-from-another-place/: **unchanged third-party C++ original**, below.
- setup.html: setup page for the optional upstream WebAssembly build.

## Preserved upstream (not a reimplementation of imported C++ game)

- **Taste from Another Place:** https://github.com/mikegiannako/taste-from-another-place
- Pinned original revision: b1f262c951ce57a5af252b059557c0db0a6ef839.
- MIT license in vendor/taste-from-another-place/LICENSE, copyright (c) 2026 Art3mis.
- The upstream is **single-player** and includes an overhead kitchen, customers, cutting and drink minigames, frying and grilling.
- The upstream **WebAssembly and assets need building** if you want to play the *separate port*. The new browser game does not.
- Its C++ gameplay source remains unchanged; the new JavaScript co-op game **does not copy its gameplay code, images or music**.

To build and play the upstream port on Linux, install emsdk (em++, emcmake, emmake), CMake, make and git; run:

    bash scripts/build-kitchen-open-source.sh
    ./start.sh

Then visit **http://localhost:3300/play/kitchen/upstream/**.

The build script fetches media from the pinned upstream revision and builds raylib for Emscripten. Original media are excluded from the repository until third-party rights are reviewed. Do not re-upload media without checking artist/audio licensing.

### Attribution and license

The upstream MIT copyright notice must remain with the upstream code. Its creators and artists are credited in vendor/taste-from-another-place/README.md. The original browser game uses system fonts, colored canvas shapes and Unicode emoji rather than copied commercial Overcooked assets. “Kitchen Chaos Lab” is independent and not affiliated with the commercial Overcooked series. The imported MIT license does not automatically relicense other apps in the games repository.
