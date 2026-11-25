# Fastball 3D project instructions

Work in this local repository on the dedicated 3D game. Read `HANDOFF.md` for open work and design decisions. The 2D Fastball Alpha v0.4 game is the reference for teaching, character, visual identity and the flight log. The user intends to publish 3D to its own GitHub repository later. Continue locally until the user requests publication.

## Source map

| File | Owns |
| --- | --- |
| `src/visor.html` | Cockpit layout, responsive styles, setup, flight guide and debrief markup |
| `src/game.js` | Flight state, clock, camera and keyboard inputs, throw controls, instruments and UI |
| `src/physics.js` | Gear, momentum, coast propagation, volume entries, closest pass, random starts and feasibility checks |
| `src/draw.js` | Canvas 2D perspective renderer, flat station faces, clipping, stars, horizon artwork, reticles, two cameras and coast overlay |
| `assets/` | Approved Fastball mission patch and Earth-horizon artwork used by both cameras |
| `scripts/build.cjs` | Embeds source and both WebP assets in the standalone `index.html` |
| `tests/balance.cjs` | Named routes, seeded pilot errors, fast-entry and recovery exercises against the built game’s physics |
| `tests/browser-tests.js` | Browser assertions exercised through the game controls and simulation clock |

Edit source and rebuild the HTML. Run the two checks in the README before calling a gameplay change complete. Update the historical shortcut test when Story lands, preserving it as a Story case and adding a standard-flight counterpart. Keep seeded comparisons reproducible and distinguish automated solver performance from human pilots.

Use the same physics and the same grab-bar volume for course displays, actual contact and replay. The station-relative coordinates are X radially outward, Y along track, Z perpendicular to the orbital plane. The camera uses a stabilized roll reference. Clock speed and frame rate must not change capture timing or the speed measured at first entry.
