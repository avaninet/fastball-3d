# Fastball 3D v0.1

Open [index.html](index.html) to fly the standalone local v0.1 build. The game, cameras and artwork work offline. The approved starting build is tagged `prototype-baseline`. [Local test results and playtest questions](REVIEW.md) cover this development round.

## First flight

**Begin flight** starts manual aiming and the 10:00 oxygen clock. Drag the forward visor or tap a bearing, select a tool, adjust power and press **Throw**. The tool follows the crosshair. Its recoil adds to your existing velocity in the opposite direction. The aft camera looks straight behind you. Pause to read the instruments and resume to change the pitch. Click outside a dialog or use its close button to return. Closing the guide or setup leaves a running flight paused.

**First rescue** starts Capt. Tommi Dylan’s Story lesson with 7:30 of oxygen. Face away and release the staged 95% battery, read the aft camera, then coast to the halfway check and the bars. The debrief continues to an oblique miss, a braking lesson and an Orbital comparison. Skip guidance to take manual control on the same coast with the 10:00 total clock, or restart from the guide. **Story flight** in setup enables assisted bearings and paused lineup on the opening and capture rule you choose. A Story release starts or resumes the clock at 1×.

**New flight** offers Straight-Line and Orbital, three named separations, and seeded Random drift. **Require a soft capture** starts unchecked and limits entry speed to 0.080 m/s when selected. A fast entry carries through the 14 × 14 × 3.2 m grab volume. Clear it before attempting another entry. When the last throw leaves no intersection before oxygen expiry, the debrief opens immediately. An approaching final entry still plays out.

New random seeds begin with `D-` and include faster sideways crossings. Plain hexadecimal seeds use the original gentler drift family. Manual starts scale the gap to the nearest bars by one third. Story keeps the original geometry. Retry restores the flight’s geometry and nine tools.

## In the cockpit

- Arrow keys turn the visor 2°. Hold Shift for 0.25° adjustments. Keys 1–9 select equipment and [ or ] changes power. Enter throws when the visor has focus. P starts, pauses or resumes the clock.
- Slots 7–9 add a light tether clip, a medium inspection lamp and a heavy camera housing. The rack shows the available change in velocity and the selected pitch shows its recoil.
- Drag **Play speed** between 1× and 30×. A release resets the clock to 1×. The speedometer marks 0.080 m/s, the entry limit under soft capture and a reference under any-speed capture. The velocity panel gives signed radial, along-track and cross-track components in m/s and the current suit-plus-gear mass.
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
