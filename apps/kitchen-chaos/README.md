# 🍳 Kitchen Chaos Lab

**An original, top-down cooking game for one or two local players — playable directly in your browser.**

Kitchen Chaos Lab v0.1 is part of [Game Universe](../../README.md). Work against the clock to chop vegetables, cook soup, assemble dishes, and serve customer tickets. Play alone or cooperate with a friend on the same keyboard. The project has a lightweight **Canvas 2D client** and an independent, deterministic **JavaScript cooking engine**.

**Play:** `http://localhost:3300/play/kitchen/`  
**In-game guide:** `http://localhost:3300/play/kitchen/guide.html`  
**Source:** [Kitchen Chaos directory](https://github.com/David-tiao/games/tree/main/apps/kitchen-chaos)

> **Two different projects live here:** (1) our original local-co-op JavaScript game and (2) an **optional, separately preserved, MIT-licensed, single-player C++/raylib cooking game**. The C++ import is **not a reimplementation** of that upstream project, and its original code remains separate. Our browser game does not require or run the imported C++ code.

## Contents

- [Play in two minutes](#play-in-two-minutes)
- [Gameplay and objective](#gameplay-and-objective)
- [Controls](#controls)
- [Recipes and preparation](#recipes-and-preparation)
- [Workstations and item handling](#workstations-and-item-handling)
- [Orders and scoring](#orders-and-scoring)
- [Solo and local co-op strategies](#solo-and-local-co-op-strategies)
- [Implementation and architecture](#implementation-and-architecture)
- [Project files](#project-files)
- [Development and tests](#development-and-tests)
- [Optional upstream C++/raylib port](#optional-upstream-craylib-port)
- [Troubleshooting](#troubleshooting)
- [Current limitations and planned improvements](#current-limitations-and-planned-improvements)
- [Credits, copyright, and licenses](#credits-copyright-and-licenses)

## Play in two minutes

### Option A: Game Universe launcher (recommended)

Requirements: **Node.js 20+**, npm and a modern browser. The full hub builds Go and Gomoku on first launch; Kitchen Chaos itself needs no package installation or third-party game engine.

```bash
git clone https://github.com/David-tiao/games.git
cd games
./start.sh
```

Open:

- **Game Universe hub:** http://localhost:3300/
- **Kitchen Chaos directly:** http://localhost:3300/play/kitchen/
- **Beginner guide:** http://localhost:3300/play/kitchen/guide.html

Choose **Solo Practice** or **Local Co-op** at the start screen. Press `Ctrl+C` in the terminal to stop the server.

Already have the repository? Use `git pull --ff-only origin main` inside your checkout before starting.

### Option B: Lightweight static server (Kitchen Chaos only)

No Node.js is needed when running just this JavaScript browser game. Serve this directory with Python 3:

```bash
cd games/apps/kitchen-chaos
python3 -m http.server 8080
```

Open **http://localhost:8080/**. The browser must load the game over HTTP because `game.js` imports `shared/engine.mjs` as an ES module. Opening `index.html` directly with `file://` may fail.

### Option C: Run via an alternate hub port

```bash
PORT=3301 ./start.sh
```

Then visit `http://localhost:3301/play/kitchen/`.

## Gameplay and objective

Your goal is to deliver as many correct dishes as possible during a **150-second shift**. Orders arrive over time and expire if ignored. Each chef can hold **one item at a time**. The kitchen has a **16×11 tile layout** with shared workstations, so good positioning and division of labor matter.

The complete cooking loop is:

```text
Customer ticket arrives
         │
         ▼
Take raw ingredient from a crate
         │
         ▼
Move to a cutting board → interact to place → hold chop button
         │
         ├── Salad: chop lettuce and tomato
         │    └── Add each to a clean plate at assembly
         │
         └── Soup: chop mushroom and onion
              └── Add both to the same stove → cook → collect soup
                   └── Add soup to a clean plate at assembly
         │
         ▼
Pick up finished dish → service counter → collect points
```

The cooking timer continues while food is on the stove. If a finished soup stays on the stove for roughly **8 more seconds**, it burns and must be discarded. The order countdown runs independently of the workstations.

### First-session tips

1. Start in solo mode to learn orientation and interaction before trying two players.
2. **Face** a workstation from an **adjacent, walkable square**; the action key does not auto-target nearby stations.
3. Place a clean plate on the **assembly counter** before bringing chopped ingredients or cooked soup.
4. To retrieve something, first free your chef's hands.
5. Watch the ticket timer. Delivering early gives more points than delivering near the deadline.

## Controls

| Action | Player 1 | Player 2 |
| --- | --- | --- |
| Move one tile at a time | `W` / `A` / `S` / `D` | Arrow keys |
| Pick up, put down, or activate the faced station | `E` | `Enter` |
| Chop (hold while facing a board containing raw food) | `Space` | **Right** `Shift` |
| Pause or resume the shift | `P` | `P` |
| Restart | On-screen **Restart** button | Same |

Movement is tile-based, with a small movement cooldown. You cannot walk through a wall, counter, stove or another active chef. Facing updates when pressing a direction, even if movement is blocked; this helps turn toward a nearby station.

**Mobile:** on-screen directional and action controls support **solo practice**. A landscape display works best. Shared-keyboard two-player play is intended for desktop, not for two touch controllers.

## Recipes and preparation

### 🥗 Two-Vegetable Salad

| Ingredient | Source | Processing |
| --- | --- | --- |
| Lettuce | Lettuce crate | Chop for 2 seconds |
| Tomato | Tomato crate | Chop for 2 seconds |
| Clean plate | Plate rack | No processing |

**How to make it**

1. Pick up a clean plate and place it on the **⭐ assembly counter**.
2. Pick up a lettuce, face a free **🔪 cutting board**, and press **Interact** to place it.
3. Hold **Chop** for about two seconds. With empty hands, press **Interact** to take the chopped lettuce.
4. Bring the lettuce to the assembly counter and press **Interact** to add it to the plate.
5. Repeat the process with a tomato. After both ingredients are added, the salad is ready.
6. Take the finished salad from the assembly counter and interact with **🔔 Serve** to deliver it to a matching customer ticket.

**Ticket deadline:** 50 seconds. **Base score:** 100 points.

### 🍲 Mushroom Soup

| Ingredient | Source | Processing |
| --- | --- | --- |
| Mushroom | Mushroom crate | Chop for 2 seconds |
| Onion | Onion crate | Chop for 2 seconds |
| Clean plate | Plate rack | Required to plate cooked soup |

**How to make it**

1. Chop one mushroom and one onion at available cutting boards.
2. Put both chopped ingredients into the **same** 🔥 stove, one after the other. A stove with only one ingredient does not start completing the soup.
3. When both ingredients are present, allow roughly **6 seconds** for cooking.
4. Collect the cooked soup before it burns. If the soup burns, clear the stove and start over.
5. Place a clean plate on **⭐ assembly**. Add the cooked soup and collect the completed dish.
6. Serve at **🔔** while a soup order is active.

**Ticket deadline:** 70 seconds. **Base score:** 140 points.

### Which combinations are allowed?

The engine validates each workstation interaction. Raw ingredients cannot be plated as prepared dishes. Only chopped ingredients are accepted where needed. Salad ingredients must be distinct; soup requires mushroom **and** onion. An assembled dish cannot satisfy a ticket for a different recipe.

## Workstations and item handling

| Station | Symbol | Function |
| --- | --- | --- |
| Ingredient crate | 🧺 | Supplies the selected raw ingredient when hands are empty |
| Plate rack | 🍽️ | Supplies a clean empty plate |
| Cutting board | 🔪 | Holds one raw ingredient; progress advances while a chef holds Chop |
| Stove | 🔥 | Accepts chopped soup ingredients; cooks and can burn soup |
| Counter | 📦 | Temporarily stores a single item |
| Transfer counter | 📮 | Shared handoff point between chefs |
| Assembly counter | ⭐ | Combines a plate with required processed ingredients or soup |
| Serving window | 🔔 | Checks the completed dish against a pending order |
| Trash bin | 🗑️ | Discards an item being carried |

In the starter map there are **two cutting boards**, **two stoves**, multiple counters, and one central assembly station. Only one chef can acquire a particular stored item in the same simulation step. For handoff, place an ingredient on an empty transfer counter, move away, and have the other chef collect it.

Items cannot simply be dropped anywhere on the floor: use a suitable counter or workstation. There is no automatic inventory stacking.

## Orders and scoring

| Rule | Current behavior |
| --- | --- |
| Shift length | 150 seconds |
| Starting orders | One salad + one soup |
| New orders | Attempted about every 22 seconds; maximum three pending |
| Salad base score | +100 |
| Soup base score | +140 |
| Early delivery bonus | Up to +40 proportional to remaining ticket time |
| Combo bonus | +10 per current streak level, capped at +30 |
| Expired ticket | −20 and combo reset |
| Serving a dish with no matching ticket | −10, combo reset, dish retained |
| Throwing away an item | Counts toward waste statistic |
| Shift end | End screen with score, deliveries, expiry count, waste, errors and movement |

The score for a successfully fulfilled order is calculated from the recipe base score, the remaining-time reward, and the current streak. Multiple outstanding tickets can coexist. The simulation expires each ticket only once.

There is currently no persistent leaderboard or cloud save system. Stats are summarized at the end of each local session.

## Solo and local co-op strategies

**Solo practice:** Prepare a plate on the assembly counter first; chop vegetables as soon as you can, then plate and serve. For soup, never leave the finished pot unattended while gathering a plate.

**Two-player co-op:** Try one chef as ingredient/prep specialist and the other as plating/cooking/server specialist. Use **📮 transfer** when a chef needs to hand over chopped ingredients. Communicate before accessing a shared workstation so neither chef blocks the other.

**What local co-op means:** Two people use the same computer and keyboard, share one kitchen and one set of orders, and receive a shared score. It is **not** internet multiplayer, split-screen networking, or an AI assistant.

## Implementation and architecture

The original game uses a small, dependency-free split between a renderer/controller and a rules engine:

```text
index.html
    │
    ├── style.css               Responsive layout and panels
    └── game.js                 Keyboard/touch input, Canvas rendering, HUD
           │
           ▼
     shared/engine.mjs           Deterministic game rules
           ├── state / player movement
           ├── collision and facing
           ├── station interactions / item custody
           ├── recipes / chopping / cooking / burning
           ├── timed orders / scoring / combo
           └── game events / shift end
```

Key exports from `shared/engine.mjs`:

| Export | Role |
| --- | --- |
| `createKitchen({ seed, duration, coop })` | Creates a new kitchen state with ingredients, stations, chefs and initial orders |
| `startKitchen(state)` | Starts or resumes a ready/paused game |
| `togglePause(state)` | Pauses or resumes simulation |
| `stepKitchen(state, inputs, dt)` | Applies movement/actions, advances cooking/order timers and updates scores |
| `stationAt(state, x, y)` | Finds a workstation at a tile |
| `walkable(state, x, y)` | Validates walkable floor tiles |
| `stationFacing(state, player)` | Finds the station directly in front of a chef |
| `RECIPES` / `INGREDIENTS` | Current cooking definitions and display metadata |

The browser runs the simulation in **50 ms fixed steps** (20 Hz) using a requestAnimationFrame render loop. The engine itself has no DOM or Canvas dependency and is directly unit-testable in Node.js. Identical initial state, seed, timing, and inputs should yield identical results.

The v0.1 engine modifies an explicit game-state object. A future online version would need a server-authoritative version of this engine, validated input sequences, reconciliation and reconnect support; these features do not exist today.

## Project files

```text
apps/kitchen-chaos/
├── README.md                      This guide
├── index.html                     Browser game entry
├── guide.html                     In-game beginner guide
├── game.js                        Input, HUD, Canvas and round flow
├── style.css                      Responsive layout and touch controls
├── shared/
│   └── engine.mjs                 Deterministic cooking rules
├── setup.html                     Page for optional upstream port when not built
├── .gitignore                     Generated assets/build cache exclusions
└── vendor/
    └── taste-from-another-place/  Separately preserved MIT C++/raylib source

tests/
├── kitchen-engine.test.mjs        Original game rule tests
└── kitchen-upstream.test.mjs      License, integration and build-script checks

scripts/
└── build-kitchen-open-source.sh   Optional C++ WebAssembly build helper
```

The main HTTP gateway in `hub/server.mjs` serves the playable game at `/play/kitchen/` and the separate built upstream port at `/play/kitchen/upstream/`.

## Development and tests

Run from the **repository root**:

```bash
npm run kitchen:test
npm run check
```

Or run the focused test suite:

```bash
node --test tests/kitchen-engine.test.mjs tests/kitchen-upstream.test.mjs
node --check apps/kitchen-chaos/game.js
node --check apps/kitchen-chaos/shared/engine.mjs
```

The rule tests exercise:

- Initial order generation and kitchen configuration.
- Raw ingredient collection and two-second chopping.
- Salad and soup assembly, correct delivery and scoring.
- Cooked vs. burnt soup and cleaning the stove.
- Single-item pickup when two chefs attempt access at once.
- Wrong-order penalties and expired-ticket handling.
- Walkable routes to adjacent station tiles.
- Reproducible simulation with a fixed random seed.

**Manual acceptance pass** (recommended after changes): open the game in Chrome or Firefox, complete one salad and one soup, use both chefs and the transfer counter, pause/restart, and verify the game reaches the shift-end screen. These checks require a browser and are distinct from the Node.js test suite.

### Extending recipes

Start in `shared/engine.mjs`: the recipe metadata, item kinds, workstation state transitions, and preparation rules are defined there. A new recipe will require explicit cooking/assembly rules, UI recipe instructions, and tests—not only a new entry in `RECIPES`.

### Extending the kitchen

Map/station placement is defined in `STATION_CONFIG`. Keep every workstation accessible from an adjacent walkable tile; tests verify reachability. Add new controls and animations in `game.js`, and keep authoritative cooking/scoring logic inside the engine instead of the renderer.

## Optional upstream C++/raylib port

The repository also includes the original **[Taste from Another Place](https://github.com/mikegiannako/taste-from-another-place)** source for comparative study.

**What it is**

- A distinct **single-player** top-down cooking game written in **C++17** using raylib.
- Original gameplay includes timed customers, food preparation, cutting and drink mini-games, grilling and frying.
- Imported at fixed upstream commit **`b1f262c951ce57a5af252b059557c0db0a6ef839`**.
- Distributed with its own **MIT license**, copyright © 2026 Art3mis, preserved in `vendor/taste-from-another-place/LICENSE`.
- Original game logic is retained rather than replaced by our browser game.

**Build status:** The original source is checked in, but the optional **WebAssembly and assets need building** on a Linux machine. Neither the original game nor its media are required by our Canvas co-op implementation.

### Build the optional upstream game

1. Install Git, CMake, Make, and the [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html). Ensure `em++`, `emcmake` and `emmake` are available in the terminal.
2. From the repository root, run:

```bash
bash scripts/build-kitchen-open-source.sh
./start.sh
```

3. Open **http://localhost:3300/play/kitchen/upstream/**.

The build helper fetches original media from the pinned upstream revision, builds the raylib dependency for the web, and compiles the original C++ project. It verifies the source revision before copying media to the local, untracked asset directory.

If the port is not built, `/play/kitchen/upstream/` shows a setup page rather than a pretend playable screen. The regular `/play/kitchen/` is the original JavaScript co-op game and works without these tools.

### Licensing boundary

The imported C++ software is licensed under MIT, but this does not automatically license original art, music, other games, or the overall repository. The upstream project lists its contributors in `vendor/taste-from-another-place/README.md`. Do not republish downloaded upstream media until its own licensing and rights have been checked.

## Troubleshooting

| Problem | Explanation / fix |
| --- | --- |
| Browser console reports module/CORS problems when opening a file | Do not use `file://`; serve the directory with Python HTTP server or the game hub |
| Chef does not pick up a nearby item | Stand on adjacent floor and face the workstation directly |
| Chopping bar does not progress | Place a raw ingredient on a board, keep facing it, and hold the **work** key, not the interact key |
| Cannot add a vegetable to the plate | First place a clean plate on the assembly counter; use chopped lettuce/tomato only |
| Soup stays unfinished | Both chopped mushroom and onion must be inserted into the **same** stove |
| Cannot retrieve soup | Your hands must be empty; cooked soup may already have burnt |
| An order disappears | Its countdown expired; the score is penalized once |
| Two-player keys do not respond in the hub | Click inside the game area to focus the embedded game |
| Port 3300 is busy | Start with `PORT=3301 ./start.sh` |
| `/play/kitchen/upstream/` displays a setup page | The **optional** C++ port has not been compiled yet |

## Current limitations and planned improvements

### Implemented in v0.1

Local solo/co-op, tile movement and collision, two recipes, ingredient processing, timed tickets, cooking/burning, workstations, handoff, shared scoring, responsive HUD, and basic solo touch controls.

### Not currently included

- Remote online co-op or room codes.
- AI-controlled co-chefs.
- Multiple kitchen levels, moving hazards or persistent saves.
- Expanded recipe library, formal in-game tutorial campaign, full localization or custom art/audio packs.
- Server-authoritative multiplayer, rollback prediction, mobile two-person touch mode.

### Potential next milestones

| Milestone | Focus |
| --- | --- |
| v0.2 | Character animations, clearer interaction hints, additional recipes/maps, tutorial and AI helper |
| v0.3 | 2–4 player online rooms, synchronized orders, reconnect/resume and networking tests |
| Later | Events and obstacles, accessibility settings, replay viewer and performance analytics |

These are proposed directions, not features already shipped.

## Credits, copyright, and licenses

**Kitchen Chaos Lab** is an independent cooking-game prototype inspired by the cooperative kitchen genre. It does **not** contain artwork, audio, level designs, or game code from the commercial **Overcooked** series, and is not affiliated with its publisher or creators.

The imported **Taste from Another Place** project remains separately credited to its upstream authors and artists. Its MIT license and original copyright notice are preserved in the vendor directory.

The larger `games` repository currently does **not** declare a repository-wide open-source license. Do not assume the imported MIT license covers the JavaScript cooking game or unrelated games. For rights and usage decisions, consult each component's own notices and the repository owner.

---

**Back to Game Universe:** [Repository home](../../README.md) · **Play:** `/play/kitchen/` · **Learn:** `/play/kitchen/guide.html`
