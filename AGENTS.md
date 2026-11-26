# Fastball 3D project instructions

Work in this repository on the dedicated 3D game. Use `REVIEW.md` and `DIFFICULTY.md` for open playtests. `HANDOFF.md` records the historical prototype. The 2D Fastball Alpha v0.4 game is the reference for teaching, character, visual identity and the flight log. The publication repository is `avaninet/fastball-3d`. GitHub Pages serves the standalone `index.html` from the root of `main`.

## Source map

| File | Owns |
| --- | --- |
| `src/visor.html` | Cockpit, setup, flight guide and debrief markup |
| `src/cockpit.css` | Cockpit and dialog styling, including responsive layouts |
| `src/game.js` | Flight state, clock, camera and keyboard inputs, throw controls, instruments and UI |
| `src/physics.js` | Gear, momentum, coast propagation, volume entries, closest pass, random starts and feasibility checks |
| `src/debris.js` | Dodgeball pieces, collision boxes, the DB1 generator and avoidance predictions. Dimensions are in [Debris assembly](reference/debris-assembly.md). |
| `assets/dodgeball-seeds.json` | Qualified Random Dodgeball seed IDs. Regenerate with [the catalog study](reference/random-dodgeball-study.md). |
| `src/earth.js` | Photographic Earth projection, GPU texture and software fallback shared by both cameras |
| `src/station.js` | Station assembly, surface order and tool visibility. Dimensions and mating faces are in [Station assembly](reference/station-assembly.md). |
| `src/equipment.js` | Rack artwork, released tool sprites and their visual lifetimes |
| `src/draw.js` | Canvas 2D perspective renderer, shaded station faces, clipping, stars, reticles, two cameras and coast overlay |
| `src/readout.js` | Numeric formatting, visor orientation and trim directions |
| `src/log.js` | Flight reconstruction, projected charts, release records and share-card artwork |
| `src/share.js` | Replay parsing, links, clipboard and image export |
| `src/story.js` | Guided lessons and course checks |
| `src/main.js` | Startup, replay navigation and animation loop initialization |
| `assets/` | Approved Fastball mission patch and Earth-horizon artwork used by both cameras |
| `scripts/build.cjs` | Embeds source and both WebP assets in the standalone `index.html` |
| `scripts/csp.cjs` | CSP source hashes shared by the build and browser fixture |
| `scripts/browser-qa.cjs` | Browser fixture and automated Chromium viewport runs |
| `tests/station.cjs` | Geometry and mating-face checks for the 28-part station |
| `package.json` | Release version, supported Node version and test commands |
| `.github/workflows/check.yml` | Offline build, balance, font-specific browser and native input checks in CI |
| `reference/` | Flight examples, station measurements and the Alpha manual |
| `tests/dodgeball.cjs` | Dodgeball collisions and playable routes under both flight models |
| `tests/difficulty.cjs` | Reproducible pilot study on the original drift families |
| `tests/balance.cjs` | Named routes, seeded pilot errors, fast-entry and recovery exercises against the built game’s physics |
| `tests/native-browser.cjs` | ChromeDriver checks for native Space activation, clipboard handling and PNG export |
| `tests/browser-tests.js` | Browser assertions exercised through the game controls and simulation clock |

Edit source and rebuild the HTML. Run the build, balance and browser checks in the README before calling a gameplay change complete. Re-run the difficulty study after physics or hint changes. Preserve the Story battery shortcut and its manual counterpart. Keep seeded comparisons reproducible and distinguish automated solver performance from human pilots.

Use the same physics and the same grab-bar volume for course displays, actual contact and replay. The station-relative coordinates are X radially outward, Y along track, Z perpendicular to the orbital plane. The camera uses a stabilized roll reference. Clock speed and frame rate must not change capture timing or the speed measured at first entry.
