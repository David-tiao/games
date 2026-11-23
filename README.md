# 🎮 Game Universe — Games Hub

**Seven browser-based games. One launcher. One local server.**

Game Universe is a multi-game project built around interactive play, approachable controls, and explainable game logic. It brings board games, puzzles, a basketball simulator, an experimental computer-vision playground, and an **original cooperative cooking game** into one browser-based hub.

**Current release: v1.9.0** · **Primary environment: Linux / Ubuntu** · **Default port: 3300** · **Node.js: 20+**

> **Project status:** The seven game entries are integrated into the hub. Features differ by game: Go and Gomoku offer online rooms; Kitchen Chaos supports **local** two-player cooperation only. A third-party C++ cooking game is preserved separately as an optional WebAssembly port and is **not** required to play Kitchen Chaos.

## Table of contents

- [Games at a glance](#games-at-a-glance)
- [Quick start](#quick-start)
- [Kitchen Chaos: cooperative cooking](#-kitchen-chaos-cooperative-cooking)
- [Other games](#other-games)
- [Architecture and technology](#architecture-and-technology)
- [Project layout](#project-layout)
- [Development and testing](#development-and-testing)
- [Optional Python ball tracking](#optional-python-ball-tracking)
- [Optional upstream kitchen port](#optional-upstream-kitchen-port)
- [Configuration and local-network access](#configuration-and-local-network-access)
- [Troubleshooting](#troubleshooting)
- [Privacy, security, and licensing](#privacy-security-and-licensing)
- [Known limitations and roadmap](#known-limitations-and-roadmap)
- [Release history](#release-history)

## Games at a glance

| # | Game | What you can play | Multiplayer status | Route |
| --- | --- | --- | --- | --- |
| 01 | **Go Academy** | Go on 9×9, 13×13, and 19×19 boards, interactive lessons, heuristic AI | Online rooms + AI practice | `/play/go/` |
| 02 | **Gomoku** | Five-in-a-row matches, learning content, and computer opponents | Online rooms + AI practice | `/play/gomoku/` |
| 03 | **Star Array: Resonance** | GF(2) grid-toggle logic puzzles, solvability and strategy | Single-player | `/play/star/` |
| 04 | **Minesweeper Lab** | Adjustable boards, difficulty settings, logic-based hints | Single-player | `/play/mines/` |
| 05 | **Neon Ball Lab** | Simulated ball motion and collisions with detection/tracking visualization | Interactive lab, not a multiplayer arena | `/play/balls/` |
| 06 | **Stickman Hoops** | Top-down 3v3 basketball, ball handling, shooting, tactics, AI | Local player vs. AI | `/play/basketball/` |
| 07 | **Kitchen Chaos Lab** | Prepare ingredients, chop, cook, plate, and serve timed orders | Solo or **two players on one keyboard** | `/play/kitchen/` |

All routes above are relative to `http://localhost:3300` after starting the full hub. The home page is located at `/`.

## Quick start

### Requirements

| Requirement | Needed for | Notes |
| --- | --- | --- |
| **Node.js 20 or newer** | Main server and game hub | Verify with `node --version` |
| **npm** (10+ recommended) | Installing/building Go and Gomoku clients | Verify with `npm --version` |
| **Git** | Cloning and updating the repository | Also used by optional build helpers |
| **Bash** | Automated launcher and installation scripts | Linux recommended; macOS may work; Windows users should use WSL |
| **Modern browser** | Playing games | Chrome/Chromium or Firefox recommended |
| **Internet access on first setup** | Installing missing npm packages | Go/Gomoku clients are built on startup |
| Python 3, venv, OpenCV, NumPy, SciPy | **Optional** real ball tracking | Not needed for Kitchen Chaos or the default ball demo |
| Emscripten + CMake + Make + raylib build | **Optional** third-party C++ kitchen WebAssembly port | Not needed for the original browser cooking game |

Ubuntu: install Git and basic tools using your package manager, and install a current Node.js 20+ distribution. The Node.js package in older Ubuntu repositories may be too old; verify the version before starting.

### Install and run

```bash
git clone https://github.com/David-tiao/games.git
cd games
./start.sh
```

The launcher will:

1. Validate Node.js and check whether the selected hub port is already in use.
2. Run non-destructive migration helpers for legacy account data and optional ball-model weights.
3. Reuse existing dependencies when possible and install missing Go/Gomoku workspace dependencies.
4. Build the Go and Gomoku frontends.
5. Start the single-entry hub and its internal game backends; start the optional Python tracker only when its dependencies are available.

Open **http://localhost:3300/** or go directly to **http://localhost:3300/play/kitchen/** for the cooking game.

To stop, press `Ctrl+C` in the terminal. To change the hub port:

```bash
PORT=3301 ./start.sh
```

### Update an existing clone

```bash
cd ~/games
git pull --ff-only origin main
./start.sh
```

If the project lives somewhere other than `~/games`, change to that directory instead. `git pull --ff-only` intentionally refuses to overwrite divergent local commits; resolve local modifications before updating.

### Optional `games` shell command

```bash
./scripts/install-launcher.sh
```

This creates `~/.local/bin/games` pointing to the current checkout. When that directory is in `PATH`, use `games` to launch the hub from any working directory.

## 🍳 Kitchen Chaos: cooperative cooking

**[Open the game](http://localhost:3300/play/kitchen/)** · **[Gameplay guide](apps/kitchen-chaos/guide.html)** · **[Full kitchen documentation](apps/kitchen-chaos/README.md)**

Kitchen Chaos Lab v0.1 is a **separate, original Canvas 2D cooking game**, built for quick local sessions. Choose solo practice or two-player same-keyboard co-op at the title screen. No proprietary Overcooked artwork, source code, or music is included.

### Gameplay loop

**Pick ingredients → chop them → cook if required → combine with a clean plate → serve the correct order before its timer expires.**

| Recipe | Ingredients | Preparation | Base score | Order timer |
| --- | --- | --- | --- | --- |
| 🥗 Two-Vegetable Salad | Lettuce + tomato | Chop each for 2 seconds, add both to a plate | 100 | 50 s |
| 🍲 Mushroom Soup | Mushroom + onion | Chop each, add to one stove, cook for about 6 seconds, then plate | 140 | 70 s |

The kitchen uses a 16×11 tile map with ingredient crates, cutting boards, stoves, counters, a transfer station, a plating counter, a serving window, and a trash bin. Two orders appear initially; additional orders are scheduled approximately every 22 seconds, with up to three queued at once. A shift lasts **150 seconds**.

Soup can burn if left on a stove too long after cooking. Correct deliveries earn a base score, a remaining-time bonus, and a small combo bonus. Expired tickets cost 20 points; trying to serve a dish for which no matching ticket exists costs 10 points.

### Keyboard controls

| Action | Player 1 | Player 2 |
| --- | --- | --- |
| Move | `W` `A` `S` `D` | Arrow keys |
| Pick up / put down / use station | `E` | `Enter` |
| Chop (hold while facing a loaded cutting board) | `Space` | **Right** `Shift` |
| Pause / resume | `P` | `P` |

**Important:** A chef must face a station from an adjacent floor tile. To chop, place a raw ingredient on a cutting board, face the board and hold the work key, then interact again with empty hands to retrieve the chopped ingredient. The assembly counter needs a clean plate before adding ingredients.

Touch controls are provided for **solo play** on supported mobile browsers; two-player mode is designed for a shared desktop keyboard. The first release does **not** implement online cooking rooms, AI co-chefs, a campaign, or 3D environments.

### What is actually implemented?

- Original client UI: `apps/kitchen-chaos/index.html`, `style.css`, `game.js`.
- Independent game rules: `apps/kitchen-chaos/shared/engine.mjs`.
- Movement and collision, item/station interactions, recipes and cooking progress, ticket deadlines, score and end-of-shift summary.
- Fixed 50 ms simulation steps and reproducible state evolution for a given seed and input sequence.
- Automated tests covering item handling, cooking, scoring, co-op pickup exclusivity, map reachability, and determinism.

The imported **Taste from Another Place** C++ game is retained under `apps/kitchen-chaos/vendor/` as a distinct MIT-licensed **single-player** project. It is **not** the codebase behind this new co-op browser game. See [Optional upstream kitchen port](#optional-upstream-kitchen-port).

## Other games

### Go Academy

Go supports 9×9/13×13/19×19 boards, online matches and AI practice. The learning module contains 50 lessons and 16 methodology collections, plus an explainable heuristic analysis area. See `apps/go-online/` and the learning UI inside the game.

### Gomoku

Gomoku includes player-versus-player rooms and single-player practice against a heuristic opponent. A set of 12 lessons explains board patterns and scoring logic. See `apps/gomoku-online/` and `/learn/gomoku/`.

### Star Array: Resonance

A Lights Out–style mathematical puzzle game with 3×3, 5×5 and 7×7 modes. Its GF(2) modeling supports Gaussian elimination, solution-space reasoning and minimum-move exploration. See `apps/star-array/`.

### Minesweeper Lab

A customizable Minesweeper experience with difficulty presets, adjustable mine counts and a logic helper based on revealed tiles rather than hidden mine locations. A 12-lesson learning section is integrated into the hub. See `/play/mines/` and `/learn/mines/`.

### Neon Ball Lab

A motion and tracking playground featuring 1–8 moving, colliding balls, bright motion trails and visualization of detection, filtering and prediction. It offers browser-only pixel-based demonstration tracking and optional on-device Python/OpenCV + Kalman/Hungarian multi-object tracking. **Browser demonstration tracking is not YOLO**; actual YOLO inference requires a trained weight file and the appropriate optional dependencies.

[Neon Ball Lab documentation](apps/neon-ball-lab/README.md)

<p align="center">
  <img src="apps/neon-ball-lab/preview_v4_final.png" alt="Neon Ball Lab visualization — an algorithm experiment, not the Kitchen Chaos game" width="720">
</p>

### Stickman Hoops

A top-down 3v3 game against computer-controlled players. Includes passing, shooting, dribble moves, layups/dunks, clock rules, defensive actions and tactical presets. The current version is **local versus AI**, not online six-player or ten-player basketball. Source: `apps/basketball/`.

## Architecture and technology

The hub uses a single Node.js HTTP server (`hub/server.mjs`) and routes each game by path. Go and Gomoku run as separate internal processes. The hub proxies their HTTP and WebSocket traffic from the shared origin; the optional Python tracker also runs on a local internal port. Other games, including Kitchen Chaos, are served as browser assets.

```text
Browser
   │
   ▼
Game Hub — Node.js HTTP server (default :3300)
   ├── /                  → game selection and full-screen player
   ├── /play/go/          → Go Node.js/Socket.IO backend
   ├── /play/gomoku/      → Gomoku Node.js/Socket.IO backend
   ├── /play/star/        → Star Array browser application
   ├── /play/mines/       → Minesweeper page
   ├── /play/balls/       → browser ball lab (+ optional Python API)
   ├── /play/basketball/  → local Canvas basketball
   └── /play/kitchen/     → local Canvas cooperative cooking
        └── /upstream/    → optional built C++/raylib WebAssembly port
```

**Technology by subsystem:**

- **Hub/server:** JavaScript ES modules, native Node.js `http`/`net` APIs and same-origin routing.
- **Go/Gomoku clients:** React 18, TypeScript and Vite; multiplayer backends use Socket.IO.
- **Kitchen/Basketball:** Browser Canvas 2D plus JavaScript game logic.
- **Star Array, Minesweeper, educational pages:** HTML/CSS/JavaScript.
- **Optional vision stack:** Python 3, NumPy, OpenCV, SciPy; Ultralytics/YOLO training is optional.

Game mechanics live in their respective apps, rather than in the lobby frontend.

## Project layout

```text
games/
├── README.md
├── package.json                  # Root npm scripts
├── start.sh                      # Recommended setup and startup command
├── hub/
│   ├── server.mjs                # HTTP gateway, routing, process launch, proxy
│   ├── public/                   # Main game lobby
│   └── learning/                 # Browser lesson pages
├── apps/
│   ├── go-online/                # Go client, server, lessons and tests
│   ├── gomoku-online/            # Gomoku client, server and tests
│   ├── star-array/               # Puzzle client and GF(2) logic
│   ├── basketball/               # Stickman gameplay and Canvas renderer
│   ├── neon-ball-lab/            # Simulations, trackers and optional YOLO tools
│   └── kitchen-chaos/
│       ├── README.md             # Kitchen-specific guide
│       ├── index.html            # Playable kitchen entry
│       ├── guide.html            # Beginner guide
│       ├── game.js               # Controls, Canvas rendering and HUD
│       ├── style.css
│       ├── shared/engine.mjs     # Cooking rules and deterministic updates
│       └── vendor/              # Separate MIT-licensed C++/raylib project
├── scripts/                      # Setup, data migration and optional builds
├── tests/                        # Hub, gameplay and integration tests
└── docs/                         # Design notes, research and future milestones
```

## Development and testing

Run commands from the repository root unless otherwise indicated.

| Command | Purpose |
| --- | --- |
| `./start.sh` | Full startup: dependency checks, Go/Gomoku builds, services |
| `npm start` | Start hub directly; assumes required builds/dependencies are ready |
| `npm run build` | Build Go and Gomoku clients |
| `npm run check` | Syntax checks for main hub and selected browser modules |
| `npm test` | Root tests plus Go, Gomoku, and Star Array test suites |
| `npm run kitchen:test` | Kitchen game and upstream integration tests only |
| `npm run kitchen:check` | Syntax check for upstream kitchen build script |
| `npm run test:ball` | Ball lab Python tests, if Python dependencies are installed |
| `npm run kitchen:build` | Optional C++/raylib WebAssembly build (requires Emscripten) |

Example for Kitchen Chaos:

```bash
npm run kitchen:test
node --check apps/kitchen-chaos/game.js
node --check apps/kitchen-chaos/shared/engine.mjs
```

Automated checks do not replace playing through a full round in your desktop browser. If modifying input handling, test both keyboard layouts and browser focus.

## Optional Python ball tracking

The default browser demo does **not** require Python. To add local OpenCV detection and Kalman/Hungarian tracking on Ubuntu:

```bash
# You may need the distribution's python3-venv package first.
./scripts/install-ball-tracker.sh

# Restart the hub after installation.
./start.sh
```

The installation script creates `apps/neon-ball-lab/.venv` and installs NumPy, OpenCV and SciPy. The hub detects the environment during startup. Supported settings are `BALL_TRACKING_MODE=classical`, `hybrid` (default), and `yolo`; using neural network inference requires compatible dependencies and weights.

The repository does **not** ship a trained YOLO model. Refer to [Neon Ball Lab's detailed README](apps/neon-ball-lab/README.md) for dataset generation, training and separate tracking modes. The old 100-point ball scoring model measures the tracked primary ball, not a general multi-object tracking benchmark.

## Optional upstream kitchen port

The original co-op browser game requires **no C++ toolchain**. For comparison or educational exploration, the repository also preserves the MIT-licensed, **single-player** [Taste from Another Place](https://github.com/mikegiannako/taste-from-another-place) source (C++17 + raylib). This is a separate upstream project, credited and version-pinned.

To build that project on Linux, install the [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) so `em++`, `emcmake` and `emmake` are on `PATH`, plus Git, CMake and Make:

```bash
bash scripts/build-kitchen-open-source.sh
./start.sh
```

Once built, open `http://localhost:3300/play/kitchen/upstream/`. Until then, that route shows setup instructions. The build helper downloads original media at the pinned source revision; media rights must be reviewed separately before redistribution.

For attribution and a detailed distinction between the two implementations, see [Kitchen Chaos documentation](apps/kitchen-chaos/README.md).

## Configuration and local-network access

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `3300` | Public-facing hub HTTP port |
| `HOST` | `0.0.0.0` | Address on which the hub listens; set `127.0.0.1` to restrict to the local machine |
| `BALL_PYTHON` | Kitchen-independent Python venv path | Override the optional ball-tracker Python executable |
| `BALL_TRACKING_MODE` | `hybrid` | Optional tracker: `hybrid`, `classical`, or `yolo` |
| `CORS_ORIGINS` | Service-specific | Optional origin restrictions for services that support this setting |

For example, to run only on your own machine:

```bash
HOST=127.0.0.1 PORT=3300 ./start.sh
```

For LAN use, other devices on the same trusted network can open `http://YOUR-LAN-IP:3300` when the host firewall permits it. **This is not a production-hardened public deployment.** The default hub listens on all network interfaces; do not expose it directly to the internet without access control, HTTPS, an appropriate reverse proxy and security review.

### Health endpoints

- `GET /api/health` — hub and backend process registration.
- `GET /api/services` — best-effort health checks for Go, Gomoku and optional ball service.

A disabled Python tracker does not prevent the local cooking game from running.

## Troubleshooting

| Symptom | Check or fix |
| --- | --- |
| `node` not found or version below 20 | Install an actively supported Node.js 20+ runtime; confirm with `node -v` |
| First startup fails during npm installation | Verify internet access, then retry `./start.sh`; inspect the Go/Gomoku npm error |
| Port 3300 already in use | Stop the other process or run `PORT=3301 ./start.sh` |
| Hub starts but Go/Gomoku does not load | Run `./start.sh` (not only `npm start`) to ensure client builds and dependencies exist |
| Kitchen page is blank | Open it over HTTP, not `file://`; check browser console and `/play/kitchen/shared/engine.mjs` |
| Keyboard input does not respond in the hub | Click inside the game frame to focus it; release keys when switching windows |
| Cooking interaction does nothing | Stand **next to** and **face** the workstation; plates must be placed before assembling |
| Ball tracker says unavailable | Default demo works without it; install the optional Python environment and restart |
| Optional upstream kitchen route shows setup | The C++ WebAssembly port has not been built; run the separate build script |

You can also play the original JavaScript cooking game without starting the multi-app hub:

```bash
cd apps/kitchen-chaos
python3 -m http.server 8080
# Open http://localhost:8080/
```

This static-server option runs Kitchen Chaos only; the other hub routes and multiplayer backends are not started.

## Privacy, security, and licensing

- Go and Gomoku store account state locally in their respective `server/data` directories. Runtime user data is excluded from source control; do not commit real account records.
- `.env` files, generated builds, Python environments, and model weights are excluded by repository ignore rules. Never commit API keys, tokens, or credentials.
- The interactive ball demo can run entirely in a browser. Optional local Python processing is not an external cloud inference service.
- This project is intended for local development and trusted LAN play by default, **not** unattended public hosting.
- **No repository-wide license is currently declared.** Public availability on GitHub does not automatically grant unrestricted redistribution or relicensing rights.
- The independent third-party kitchen port retains its own MIT license and copyright notices. Its visual/audio assets may have separate rights. The imported MIT notice does **not** apply automatically to other folders.
- Kitchen Chaos Lab is a genre-inspired independent work, **not affiliated with the commercial Overcooked franchise**; it does not bundle Overcooked content.

## Known limitations and roadmap

**Implemented now:** seven routed experiences; local Kitchen Chaos gameplay; Go and Gomoku online rooms; standalone puzzles; local basketball AI; browser ball lab and optional tracking.

**Not yet implemented:** online Kitchen Chaos co-op, AI kitchen teammates, 1–4 player remote cooking rooms, kitchen map editor, unified Go/Gomoku account system, ten-player basketball, or production-grade internet deployment. In the ball lab, browser tracking, classical OpenCV tracking and separately trained YOLO are intentionally distinguished.

**Suggested kitchen milestones:**

1. **v0.2:** improved character and kitchen art, stronger input feedback, new recipes, guided tutorial, local AI teammate.
2. **v0.3:** authoritative 2–4 player online rooms, synchronized timers, reconnect handling and multiplayer tests.
3. **Later:** varied maps, environmental hazards, replay/analytics, accessibility and localization.

These are development goals, not promises of shipped features.

## Release history

| Version | Highlights |
| --- | --- |
| **v1.9** | Original browser-playable **Kitchen Chaos v0.1** with local co-op, cooking stations, orders and scoring |
| **v1.8** | Preserved MIT-licensed C++ cooking game's source and optional WebAssembly build path |
| **v1.7** | Expanded Stickman Hoops controls, actions and tactics |
| **v1.6–v1.4** | Incremental basketball features: animation, collisions, 3v3 AI and game rules |
| **v1.3** | More Minesweeper customization |
| **v1.2** | Neon Ball Lab v4.1 and optional local Python tracking |
| **v1.1** | Immersive game UI and expandable algorithm panels |
| **v1.0** | First unified multi-game hub |

---

**Repository:** [github.com/David-tiao/games](https://github.com/David-tiao/games)  
**Start locally:** `./start.sh`  
**Play the cooking game:** `http://localhost:3300/play/kitchen/`  
**Open an issue:** [GitHub Issues](https://github.com/David-tiao/games/issues)
