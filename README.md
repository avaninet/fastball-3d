# Fastball 3D

Open [index.html](index.html) to fly the standalone local prototype. The game, cameras and artwork work offline. The approved starting build is tagged `prototype-baseline`. [Local test results and playtest questions](REVIEW.md) cover this development round.

## First flight

**Begin flight** starts manual aiming and the 7:30 oxygen clock. Drag the forward visor or tap a bearing, select a tool, adjust power and press **Throw**. The tool follows the crosshair. Its recoil adds to your existing velocity in the opposite direction. The aft camera looks straight behind you. Pause to read the instruments and resume to change the pitch. Closing the guide or setup leaves a running flight paused.

**First rescue** starts Capt. Tommi Dylan’s Story lesson. Face away and release the staged 95% battery, read the aft camera, then coast to the halfway check and the bars. The debrief continues to an oblique miss, a braking lesson and an Orbital comparison. Skip guidance to fly manually or restart from the guide. **Story flight** in setup enables assisted bearings and paused lineup on the opening and capture rule you choose. A Story release starts or resumes the clock at 1×.

**New flight** offers Straight-Line and Orbital, three named separations, and seeded Random drift. **Require a soft capture** starts unchecked and limits entry speed to 0.080 m/s when selected. A fast entry carries through the 14 × 14 × 3.2 m grab volume. Clear it before attempting another entry.

New random seeds begin with `D-` and include faster sideways crossings. Enter an original hexadecimal seed without a prefix to reproduce the approved prototype’s opening. Retry restores the same geometry and six tools.

## In the cockpit

- Arrow keys turn the visor 2°. Hold Shift for 0.25° adjustments. Keys 1–6 select equipment and [ or ] changes power. Enter throws when the visor has focus. P starts, pauses or resumes the clock.
- Negative range rate means the suit is closing on the nearest part of the grab volume. The committed path and coast instruments show contact, a fast entry, or the side, distance and time of a miss. A ring identifies a coast viewed end-on. Sparse arrowheads mark bends with visible separation.
- **View flight log** in the debrief reconstructs the flown segments and actual entries. Read both equal-scale projections to distinguish a crossing in the orbital plane from a cross-track miss. The release record below gives time, tool, power, bearing, position and resulting velocity. [Example Orbital flight log](reference/orbital-flight-log.png)

## Build and check

Run these commands from `fastball-3d` with Node.js.

```sh
node scripts/build.cjs
node tests/balance.cjs
node scripts/browser-qa.cjs
```

Open the generated `qa-runner.html` for the browser results, or pass a Chromium executable path to the last command to run all four CSS viewport sizes. Additional arguments pass through to Chromium. The browser checks use local files. The build has no package dependencies.

[AGENTS.md](AGENTS.md) describes the project workflow. [HANDOFF.md](HANDOFF.md) preserves the original work order and measurements. The pitch layout uses `src/visor.html` and `src/cockpit.css`. The tutorial lives in `src/story.js` and the debrief charts in `src/log.js`.
