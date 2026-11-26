# Fastball 3D · Project handoff

**Historical prototype handoff.** The work order below was completed after `prototype-baseline`. Its six-tool rack, routes, controls and baseline counts describe that snapshot. For current controls and checks see [README.md](README.md). The [flight review](REVIEW.md) and [difficulty study](DIFFICULTY.md) track the remaining playtests.

## Start the new project

> Continue Fastball 3D from the attached local repository. Read HANDOFF.md and AGENTS.md, open index.html, and run the baseline checks. Implement the next round in this repo. First make tool selection, power and Throw usable alongside the visor, and separate manual flight from optional Story assistance. Preserve Straight-Line, Orbital, optional soft capture, the three named openings and seeded random flights. Then adapt the Alpha v0.4 rescue tutorial and backstory, evaluate directional coast arrows in both models, and build a screenshot-ready 3D flight log. Test both capture rules, compare shortcut strategies with deliberate flying, and report human playtest gaps. Keep the work local for review.

The `prototype-baseline` Git tag identifies the playable build the owner approved visually. No GitHub remote is configured. The next-round features below are the work order. The baseline itself already includes both flight models and the independent soft-capture checkbox.

## First playthrough and known issues

1. Open the default **Tether separation**, press **Face away**, and throw the 95% spare battery. Straight-Line reaches the envelope in about **5:46**. Retry the same opening in Orbital. The identical pitch misses the outline by about **4.2 m**.
2. Start a clock, pause, drag the forward visor, change power and throw. The current input handlers still allow aim and release while simulation time stands still. The same issue can arise when a drag starts before pausing. The fresh flight also allows unlimited aiming time before the first release.
3. At laptop height, locate the tool rack, power and Throw while keeping the station visible. On a narrow screen the existing bottom dock brings up power and Throw, while the rack remains elsewhere. The original UI tests check component widths and horizontal overflow. They do not establish that these controls and the visor fit together vertically.
4. Inspect the aft view after an oblique release. Both cameras already project the committed path and mark contact or nearest pass. The existing dashes can collapse toward a dot when viewed along the direction of travel. The debrief reports outcome, time, throw count and speed. There is no flight-history chart yet.

## Next-round acceptance

### 1. Bring the pitch controls into the cockpit

Keep the selector, slider and explicit Throw control together near the forward view. A compact rack anchored directly beneath the visor is one candidate. At minimum, play through select → aim → adjust power → release → read coast without scrolling back and forth at 1366 × 768 and 390 × 844. Check a short landscape viewport and keyboard focus as well. Verify actual bounding rectangles and hit targets against the visible viewport, including any fixed dock. Preserve released slots, the selected tool, recoil magnitude, and the remaining delta-v budget.

### 2. Keep the choices small and close the aiming shortcuts

**Flight model** chooses Straight-Line or Orbital. **Require a soft capture** is one independent, default-off checkbox. Offer **Story / guided rescue** as an optional entry point. Standard flight starts manual. The prototype’s six tools, full station volume and deterministic throws remain the balance baseline.

| Situation | Standard flight | Story proposal |
| --- | --- | --- |
| Reacquire the station or read drift | Manual look and a passive off-screen bearing cue. The player selects the release direction. | Face station, Face away and Face drift may rotate the reticle exactly onto those bearings. |
| Time is paused | Freeze flight and release aim. A paused press, held key, pending pointer gesture or replayed click must not change or queue the next throw. | Permit deliberate lineup while paused. Make the release/resume behavior explicit. |
| First pitch | Suggested start flow: let the player read the briefing and choose settings, then use **Begin flight** to start live aiming. | Permit a staged first pitch with step-by-step cues. |
| Course feedback | Show the actual committed coast, elapsed/remaining time, range and signed range rate. | An optional prospective guide may show the result of changing aim or power. |

When implementing, gate the actions themselves for mouse, touch and keyboard. Cover the **P** key, tab-visibility pause, flight-guide/setup dialogs, transitions out of pause and pointer release after resume. Allow the player to pause and read instruments. Review prompts as well as buttons so standard flight never tells a player to use a Story-only shortcut.

Retest face-away heavy throws, repeated straight-back throws, and drift-aligned braking on all named starts and a fixed random seed set. Also try the equivalent manual straight-back pitch without the snap buttons. Check whether any fixed recipe routinely wins across varied approaches. A genuinely good one-throw return is a valid outcome. Use oblique drift and varied geometry where needed to preserve the challenge; keep the original seeds and figures as comparisons. Random openings currently favor a provable **one-heavy-tool** soft return in both models, which biases their difficulty. A broader reachability check could admit some two-throw openings if playtests justify it.

### 3. Evaluate directional course arrows

Start with the existing committed coast and add sparse arrowheads at future time samples. Show the suit’s travel direction in both cameras, including straight closure, straight recession, an oblique flyby and a curved Orbital pass. A player should be able to tell which side they will pass and whether closest approach is ahead or behind them. Use the same flight propagator, horizon and collision test as the sim. Test a camera looking straight down the path, a path that bends out of frame, and the two projections apparently overlapping the station at different depths. Keep the closest-pass marker, miss distance and time usable in those cases. If arrows obscure more than they explain, retain the simpler committed path and readout. Reserve any exact pre-release solution for Story.

### 4. Bring Tommi and the first rescue back

**Character continuity.** Mission specialist Capt. Tommi Dylan (she/they) broke Mach 10 in the classified SR-73. The former high-school star pitcher still pitches with friends on Saturdays. A tether separates during a test of the lightweight prototype suit. The integrated thruster valves stick closed. Tools become Tommi’s remaining means of propulsion. Preserve the dry humor and the welcome for bringing the original drill home. Alpha v0.4 calls that achievement **Upmass Hero**.

**Teaching sequence.** Give Story a skippable, replayable **First rescue**. Establish what the visor aims at and let the player see the tool go one way and the suit recoil the other. Have them read the aft camera, take one halfway course check, make a light correction if needed and coast to a grab. Include an oblique miss and a short lesson on braking along the measured drift for soft capture. A fast grab must carry on through the station with a chance to return. Demonstrate orbital curvature after the player understands the straight-line case. The 2D tutorial uses a wrench pouch. Verify a suitable 3D pouch route or use the tested battery opening and explain the tool choice.

**Reference.** The Alpha v0.4 manual from the original checkout is included as [alpha-v0.4-manual.txt](reference/alpha-v0.4-manual.txt). Its relative image links refer to the original game repository. The 3D tutorial must teach the new controls and full station envelope. Treat the 2D mode ladder, unlimited Story inventory and alternate timers as historical choices. Their adoption in 3D is open.

### 5. Give the debrief a screenshot-ready flight log

Suggested first version: two linked, equal-scale orthographic views at the top of **View flight log**. Use the station center as origin and draw the full envelope in each projection. Use metres and the same scale across panes.

| Pane | Horizontal | Vertical | What it answers |
| --- | --- | --- | --- |
| Orbital plane, V-bar / R-bar | Along-track +Y to the left | Earthward −X down | Did the astronaut lead the station and bend back toward it? |
| Along-track / cross-track | Same +Y to the left | Orbit-normal +Z up | Did the apparent intercept actually pass above or below the station? |

Record the initial 3D state, flight model, elapsed flight time and each real release: timestamp, tool, power, direction, position and resulting velocity. Mark start, numbered throws, travel direction, fast entries and final capture or expiry consistently in both panes. Reconstruct each segment from the recorded state with the active flight model. Include seed where applicable, capture rule, closest clearance or entry speed, final oxygen and tool count. A third orthographic pane or a rotatable view is an option only if a playtest exposes a specific ambiguity.

Verify a cross-track miss that appears to hit in the first pane, a curved orbital return, a fast pass followed by a successful grab, and an oxygen-expiry result. The log should agree with observed timestamps and contacts at 1× and 30×. Include a readable throw list for anyone who cannot use the chart.

## Baseline evidence

The deterministic balance harness uses 128 random seeds starting at decimal 104729. Simulated pilot error is a perturbation in a 3D aiming cone plus an error in power percentage points. The game itself adds no scatter. A planned route can contain more than one throw.

| Pilot on the same 128 openings | Straight-Line | Orbital |
| --- | ---: | ---: |
| Face away, battery at 95%, any speed | 80 | 49 |
| Identical shortcut, soft capture | 57 | 27 |
| Planned soft return, exact controls | 128 | 128 |
| Planned soft return, up to 5° and 5 power points of error | 128 | 126 |
| Planned soft return, up to 10° and 10 power points of error | 113 | 106 |
| Same larger error, opportunity to replan during coast | 128 | 128 |

All three named rescues have tested browser-control routes with and without the soft speed limit in both flight models. A separate 96-case exercise per model starts with the battery and pouch spent and excessive closing speed. Braking 18 seconds before contact worked in 96/96 cases in both models. After deliberately passing through and waiting ten seconds beyond exit, a nominal return was possible in 96/96 for each model. With up to 5° and 5 power points of error on the recovery throws, 94/96 Straight-Line and 88/96 Orbital returns succeeded.

These figures establish reachable routes and the cost of errors under the harness’s timing assumptions. They do not predict the success rate of a player interpreting the visor. Keep the stock rack for the first manual playtests. Record whether an unsuccessful player could see the miss early enough, tell which way to trim, and afford the corrective throw. That distinguishes a display or control problem from a shortage of impulse.
