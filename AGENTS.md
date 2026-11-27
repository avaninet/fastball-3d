# Fastball 3D project instructions

Work in the Fastball 3D repository, `avaninet/fastball-3d`. Edit the source, then rebuild the standalone game. Keep the README for players and the full flight guide in the game. Use the release tags for earlier builds and manuals.

## Build and verify

Use Node.js 18 or newer. There are no package dependencies to install.

| When | Command |
| --- | --- |
| After editing game source or embedded artwork | `npm run build` regenerates `index.html`. Its credits use the package version and preserve the update date when the build is identical. |
| Before committing a game change | `npm test` checks the standalone file against its sources, the station joints, flight balance, F1 share codes and the two qualified catalogs. |
| After gameplay or cockpit changes | `npm run test:browser -- <chromium-executable>` runs the four viewport checks. `npm run test:browser` alone creates a local `qa-runner.html` for interactive inspection. |
| For native keyboard, clipboard and PNG export | Start a matching ChromeDriver on port 9515 and run `npm run test:native`. |
| After changing physics or directional hints | `npm run test:difficulty` compares Random Drift pilots on the current catalog. |

Use a trusted browser and trusted builds for comparisons. CI supplies its font set via `FASTBALL_QA_FONT_DIR`. Exact font setup and native browser commands are in the [workflow](.github/workflows/check.yml).

## Source and study references

| Files | Responsibility |
| --- | --- |
| `src/visor.html`, `src/cockpit.css` | Cockpit, setup, controls, guide, debrief and responsive layout |
| `src/game.js`, `src/story.js`, `src/main.js` | Flight state, inputs, guidance, startup and the animation loop |
| `src/physics.js`, `src/readout.js` | Equipment impulses, coasts, grab rules, seeded starts and directional hints |
| `src/debris.js`, `src/catalog.js`, `src/challenge.js`, `assets/*-v1.bin` | Reconstruct F1 challenges, the curated Drift states and eight debris layouts. [Debris geometry](reference/debris-assembly.md) · [Seed qualification](reference/random-dodgeball-study.md) |
| `src/station.js`, `src/draw.js`, `src/earth.js`, `src/equipment.js` | Station, visors, Earth, equipment artwork and occlusion. [Station assembly](reference/station-assembly.md) |
| `src/log.js`, `src/share.js` | Flight reconstruction, replay links and flight cards |
| `scripts/build.cjs`, `scripts/csp.cjs`, `assets/` | Embed game source, seed catalogs, WebP artwork and scenario sprites. The social preview remains a separate public JPEG. |
| `tests/`, `scripts/browser-qa.cjs`, `studies/` | Regression checks, on-demand studies and seed qualification. The Dodgeball tests import `studies/random-dodgeball.cjs`. |

Use the same physics and grab volume for the course display, contact and replays. X is radially outward, Y along track and Z perpendicular to the orbital plane. Preserve stabilized camera roll, capture timing and measured entry speed at every clock speed and frame rate. Preserve the guided battery shortcut and its manual counterpart. Keep seeded comparisons reproducible and distinguish automated pilot results from human playtests.

F1 codes identify the base opening, station pose, rules and starting aids. Keep the row mapping, approved poses and X-then-Z rotation order stable within a version. After changes to physics or geometry, run both offline catalog generators and the independent Dodgeball audit described in the [catalog study](reference/random-dodgeball-study.md). Lessons use their authored poses.

[Open playtests](reference/playtests.md) · [Historical Random Drift difficulty study](reference/random-drift-difficulty.md) · [Firm and Soft capture study](reference/capture-speed-playtest.md)

## What belongs in the project

- **Commit** the current standalone game, editable source and build inputs, regression checks, versioned seed catalogs and generators, permissions, credits, and the methods and results behind shipped gameplay decisions. Keep established replay codes and public image URLs usable.
- **Keep privately** raw third-party reviews with their linked screenshots, research inputs, and any external simulators or summarizers needed to reproduce retained findings. Use the ignored `.local/` directory for this material. Preserve exact inputs before discarding a working folder. Put unresolved, actionable questions in the playtest list.
- **Discard** generated browser fixtures, debug logs, disposable browser profiles, closed-issue screenshots and duplicate exports when their use ends. Before retiring a tracked file, check its callers and links, preserve open work, and verify the historical version is retrievable. Check uncommitted work and local-only commits before retiring a checkout.
- **Record releases** with version tags and short, player-facing GitHub release notes on publication. Keep release notes faithful to the tagged build. Preserve superseded manuals and finished handoffs in history. Update the README and in-game Guide when a player-facing rule changes.

## Publishing

The Pages workflow stages exactly `index.html` and `assets/fastball-3d-preview-v03.jpg` after validation. Preserve that JPEG path for social cards. Source, tests and study records remain available in the public repository. For the first deployment with this workflow, select **Settings → Pages → Build and deployment → Source → GitHub Actions** in the publication repository. A push to `main` or a manual workflow run on `main` can deploy the checked game. A local handoff ends at the requested commit.
