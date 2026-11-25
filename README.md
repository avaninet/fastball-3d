# Fastball 3D

A first-person EVA rescue game. Capt. Tommi Dylan has a broken tether, a stuck thruster and six things she can throw. Cross the station’s outline before the oxygen reserve runs out.

**Play:** Open `index.html` in a desktop or mobile browser. The file contains the game and its artwork. It works offline and needs no installation. In the prototype’s default Straight-Line **Tether separation**, select **Face away**, throw the preselected battery at 95%, and watch the station in the aft camera. This deliberately exposes the shortcut that the next round will move into Story.

**Continue development:** Start with [HANDOFF.md](HANDOFF.md). It contains the new-project prompt, current balance evidence, and acceptance checks for the next iteration. [AGENTS.md](AGENTS.md) describes the source and local workflow.

## Open the project

Extract the entire handoff ZIP to a working directory. Open the enclosed `Fastball-3D` folder as the project root. The archive includes the local Git history. `git status` should report a clean `main` branch and `git tag` should list `prototype-baseline`. If a project chat accepts file attachments, attach the ZIP and use the prompt at the top of the handoff.

## Flight rules in the baseline

- **Straight-Line** holds velocity constant between throws. **Orbital** propagates three-dimensional relative motion about a station on a circular 92-minute orbit.
- **Tether separation**, **Lateral drift**, **Wide separation** and **Random drift** use the same rack. A hexadecimal seed reproduces a random opening in either model.
- The station has a solid 14 × 14 m face and 3.2 m depth. Its outline marks grab-bar reach, including the visually empty spaces between panels. Any entry qualifies by default.
- **Require a soft capture** sets a maximum relative speed of 0.080 m/s at entry. A faster pass spends no extra tool and leaves the flight live. Clear the envelope and enter again to try another grab.
- The reserve is 7:30 of simulated time. Drag or tap the forward visor, or use arrow keys to aim. Choose a tool, adjust power, then explicitly press **Throw**. The aft camera looks in the opposite direction. Rotation changes aim and never imparts translation or spin.
- Each pitch adds recoil to the existing velocity. The full six-tool rack can supply about 0.329 m/s of cumulative velocity change at best. The mint coast shows the result of committed throws. Fast-forward, pause, retries, the flight guide and a brief debrief are available.

## Build and check

Node.js runs the developer tools. There are no package dependencies. From the project root:

```sh
node scripts/build.cjs
node tests/balance.cjs
node scripts/browser-qa.cjs
```

Open the generated `qa-runner.html` in a browser. The result at the bottom lists passed cases and any errors. To run the browser checks from a terminal, pass the path of a Chromium or Chrome headless executable as the first argument to `scripts/browser-qa.cjs`. It runs the suite at 1440 × 950, 1366 × 768 and 390 × 844. The built `index.html` is tracked so a fresh checkout is playable immediately.

Fastball is a very generous and forgiving approximation of a space emergency scenario that has fortunately never occurred. Do not try this on orbit.
