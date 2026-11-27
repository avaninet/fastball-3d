# Fastball 3D v0.4 capture-speed playtest

26 November 2026. The local build adds **Firm at 0.120 m/s** alongside **Soft at 0.080 m/s** and the default **Any-speed** rule. The threshold applies to total station-relative speed anywhere within the grab envelope, including an Orbital slowdown after fast entry. The ten-minute oxygen reserve, opening states, debris motion and equipment impulses are identical in each comparison.

**Recommendation. Keep Firm as an intermediate option.** Random Drift showed the strongest improvement for simulated novice and casual pilots. Every Random Dodgeball catalog seed already has a verified route to the bars under Soft. Firm buys room to spend a tool on a detour or accept a quicker return, particularly in Orbital. Soft remains a distinct precision challenge.

These are deterministic simulations with paired control errors. No human players participated. The third-party pilot estimates use assumed reading time, aim error and equipment choice. The debris-capable pilot has particularly good access to instrument data. Its rates describe that strategy. All tables read **Soft → Firm**. Resource and time medians use successful flights unless explicitly marked as paired.

## Random Drift across skill levels

The review’s simulated pilots flew 200 manual E-family openings three times each, with directional hints, the late-braking cue and Preview off. Each cell contains rescues out of 600. Manual bearing means the pilot tries to match the drift numbers. Aligned means it uses the optional Face drift aid for a braking pitch.

| Pilot | Straight-Line, manual bearing | Straight-Line, aligned | Orbital, manual bearing | Orbital, aligned |
| --- | --- | --- | --- | --- |
| Novice | 105 → 259 | 274 → 368 | 109 → 268 | 272 → 347 |
| Casual | 304 → 455 | 487 → 536 | 286 → 411 | 414 → 464 |
| Skilled | 555 → 589 | 592 → 599 | 489 → 527 | 520 → 545 |
| Expert | 599 → 600 | 600 → 600 | 558 → 581 | 570 → 584 |

The casual Orbital pilot brought home a median **0.165 → 0.259 m/s** of remaining manual Δv across wins. Among the 286 attempts won under both rules, its median paired gain was **0.073 m/s**. The full nine-tool rack provides **0.45573 m/s**. A higher grab limit changes how much braking is necessary. Individual tools still have the same recoil, and even a partial-power throw spends the tool.

## Reactive flying in all six scenarios

This pilot reacts to each forecast, attempts a braking pitch inside 30 seconds of a fast entry, and can run out of gear or oxygen. In this table it flies manual with Preview and Coach off. The five non-DB2 rows use 64 attempts per named opening or 400 attempts on 200 Random Drift seeds. Each DB2 row uses 128 attempts on 32 evenly spaced seeds drawn from that layout’s 512.

| Opening | Attempts per model/rule | Straight wins | Orbital wins | Straight tools | Orbital tools | Straight Δv (m/s) | Orbital Δv (m/s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tether separation | 64 | 64 → 64 | 64 → 64 | 1 → 1 | 5 → 4 | 0.366 → 0.366 | 0.260 → 0.294 |
| Lateral drift | 64 | 64 → 64 | 59 → 59 | 4 → 3 | 5 → 5 | 0.264 → 0.310 | 0.188 → 0.220 |
| Wide separation | 64 | 64 → 64 | 64 → 63 | 3 → 3 | 6 → 5 | 0.328 → 0.328 | 0.136 → 0.168 |
| Random drift | 400 | 383 → 393 | 323 → 353 | 5 → 4 | 5 → 4 | 0.156 → 0.194 | 0.207 → 0.246 |
| Dodgeball Challenge | 64 | 64 → 64 | 61 → 61 | 5 → 4 | 6 → 5 | 0.219 → 0.260 | 0.116 → 0.142 |
| Left cover crossing | 128 | 128 → 128 | 128 → 128 | 1 → 1 | 5 → 4 | 0.366 → 0.366 | 0.247 → 0.288 |
| Right cover crossing | 128 | 128 → 128 | 124 → 126 | 3 → 3 | 6 → 5 | 0.283 → 0.283 | 0.125 → 0.190 |
| High cover crossing | 128 | 127 → 128 | 128 → 128 | 4 → 3 | 5 → 4 | 0.260 → 0.283 | 0.260 → 0.289 |
| Low cover crossing | 128 | 125 → 128 | 116 → 122 | 4 → 4 | 6 → 5 | 0.283 → 0.283 | 0.125 → 0.190 |
| Far frame crossing | 128 | 127 → 127 | 124 → 126 | 1 → 1 | 5 → 4 | 0.366 → 0.366 | 0.218 → 0.265 |
| Near frame crossing | 128 | 125 → 127 | 124 → 126 | 3 → 3 | 7 → 6 | 0.289 → 0.289 | 0.109 → 0.176 |
| Upper frame crossing | 128 | 128 → 128 | 119 → 122 | 4 → 4 | 6 → 5 | 0.268 → 0.268 | 0.151 → 0.217 |
| Lower frame crossing | 128 | 128 → 128 | 128 → 128 | 1 → 1 | 5 → 4 | 0.366 → 0.366 | 0.260 → 0.299 |

Across the eight manual Orbital layouts, Soft captured on **991/1,024** attempts and Firm on **1,006/1,024**. Firm gained 21 rescues and lost 6 on paired draws as the reactive pilot chose different throws. Of 985 attempts won both ways, **829 used fewer tools at Firm**. A fixed collision-free Soft solution remains legal at Firm. Different decisions under the two rules can still lead to different failures.

## Debris avoidance, aids and Story inventory

Each row pools 128 attempts per layout, 1,024 per cell. “Fewer tools” counts attempts won under both rules for which Firm reduced the number of releases. Story permits paused aiming and unlimited reloads, so throw count and arrival speed are meaningful measures there. The manual Δv score applies only to finite inventory.

| Inventory | Optional aids | Straight wins | Orbital wins | Straight fewer tools | Orbital fewer tools |
| --- | --- | --- | --- | --- | --- |
| Manual | Off | 1016 → 1022 | 991 → 1006 | 262 | 829 |
| Manual | Coach | 1024 → 1024 | 1024 → 1023 | 10 | 971 |
| Manual | Preview | 1024 → 1024 | 1023 → 1024 | 32 | 490 |
| Manual | Both | 1024 → 1024 | 1024 → 1024 | 0 | 484 |
| Story | Off | 1024 → 1024 | 1024 → 1024 | 411 | 722 |
| Story | Coach | 1024 → 1024 | 1024 → 1024 | 0 | 946 |
| Story | Preview | 1024 → 1024 | 1024 → 1024 | 3 | 487 |
| Story | Both | 1024 → 1024 | 1024 → 1024 | 0 | 390 |

The near-frame crossing left the smallest median reserve in uncoached manual Orbital flight. Low cover and right cover tied for the next smallest under Soft. The layout table shows where a gentler threshold freed a throw and how much reserve reached the station. Coach can resolve a predicted debris encounter yet still leave the pilot a station miss to correct. The opening suit speed is the same 0.02678 m/s in every DB2 layout.

| Other Story openings | Attempts | Straight wins | Orbital wins | Straight throws | Orbital throws |
| --- | --- | --- | --- | --- | --- |
| Tether separation | 64 | 64 → 64 | 64 → 64 | 1 → 1 | 3 → 3 |
| Lateral drift | 64 | 64 → 64 | 64 → 64 | 3.5 → 3 | 4 → 4 |
| Wide separation | 64 | 64 → 64 | 64 → 64 | 2 → 2 | 5 → 4 |
| Random drift | 400 | 400 → 400 | 400 → 400 | 4 → 4 | 4 → 4 |
| Dodgeball Challenge | 64 | 64 → 64 | 64 → 64 | 4 → 3 | 5 → 5 |

## What the route search found

The exhaustive catalog pass applied the three-throw reference route to every DB2 seed in both flight models and inventories. All **16,384 seed/model/inventory combinations** won at each threshold. The four additional execution-error draws per seed and model used the same displaced aim, timing and power at both limits.

| Inventory | Model | Perturbed reference-route wins | Trials per rule | Seeds with one-throw solution | Seeds using two in search |
| --- | --- | --- | --- | --- | --- |
| Manual | Straight-Line | 16,378 → 16,378 | 16,384 | 4,092 → 4,092 | 4 → 4 |
| Manual | Orbital | 16,376 → 16,376 | 16,384 | 3,916 → 3,916 | 180 → 180 |
| Story | Straight-Line | 16,375 → 16,375 | 16,384 | 4,092 → 4,092 | 4 → 4 |
| Story | Orbital | 16,351 → 16,351 | 16,384 | 3,916 → 3,916 | 180 → 180 |

For manual DB2, every seed admitted a collision-free one- or two-throw solution in this bounded search under both rules. A single-throw result uses a seed-specific choice of tool, power and bearing. The standard straight-back battery throw is only one of those choices. Qualification guarantees three throws suffice, while the lower counts show why three would be a misleading “par.”

The next table counts distinct legal one- or two-throw command sequences in a fixed search grid and gives the fastest rescue found. Values are medians across 16 sampled seeds per DB2 layout or 200 Random Drift seeds, and exact grid results for the four fixed openings. Fastest times are flight-clock minutes and seconds. For rows with any unsolved opening the time median uses openings with a route. Route counts include all sampled openings.

| Manual opening | Straight legal plans | Orbital legal plans | Straight fastest | Orbital fastest |
| --- | --- | --- | --- | --- |
| Tether separation | 198 → 263 | 171 → 228 | 5:48 → 3:58 | 5:50 → 3:58 |
| Lateral drift | 682 → 829 | 312 → 404 | 4:53 → 3:49 | 4:57 → 3:53 |
| Wide separation | 25 → 85 | 10 → 66 | 8:55 → 5:55 | 8:59 → 5:52 |
| Random drift | 83 → 144.5 | 95 → 177 | 6:41 → 4:52 | 6:37 → 4:51 |
| Dodgeball Challenge | 18 → 18 | 107 → 135 | 7:34 → 7:34 | 6:49 → 3:58 |
| Left cover crossing | 84 → 126 | 82.5 → 122.5 | 5:48 → 3:58 | 6:46 → 3:58 |
| Right cover crossing | 63 → 105.5 | 93.5 → 134.5 | 6:41 → 4:53 | 6:46 → 4:54 |
| High cover crossing | 80 → 131.5 | 87.5 → 135.5 | 6:41 → 3:58 | 6:46 → 3:58 |
| Low cover crossing | 83.5 → 137 | 101 → 147 | 6:39 → 3:58 | 6:46 → 3:58 |
| Far frame crossing | 113 → 149 | 31.5 → 71 | 6:41 → 4:53 | 5:50 → 3:58 |
| Near frame crossing | 57.5 → 88 | 100 → 141.5 | 6:38 → 4:06 | 6:46 → 4:07 |
| Upper frame crossing | 80 → 127 | 85 → 126 | 6:41 → 4:53 | 6:46 → 4:54 |
| Lower frame crossing | 103.5 → 152.5 | 94.5 → 135 | 6:41 → 3:58 | 5:50 → 3:58 |

Every one of the 128 DB2 openings in this route-count sample gained legal options in each model. The fixed Dodgeball Challenge in Straight-Line kept the same 18 short plans in this grid. Wide separation gained 56 short Orbital plans, with the fastest time falling from roughly nine minutes to under six. The search found a one- or two-throw manual return for 200/200 Random Drift seeds in Straight-Line and 197/200 in Orbital at each threshold. The remaining three may require additional throws or bearings outside the grid.

## Methods and reproduction

- **Rules and geometry.** Both thresholds use the built game’s source for release, coast, first entry, in-volume slowdown and suit-to-debris clearance. Seed admission continues to use the original Soft limit. The 0.040 m/s increase can reduce the speed that must be removed on a given entry by up to 0.040 m/s. Power, release order and the mass remaining on the suit determine which physical tools that saves.
- **Known-route execution.** All 512 seeds per layout use their model-specific three throws. The four error draws are shared across seeds, with up to 3° of aim, three percentage points of power and five seconds of timing error. These are four distinct error patterns per model and layout. The larger earlier qualification study used 32 held-out draws per seed.
- **Bounded route search.** Release at 12 seconds, then optionally at 36 seconds. Test seven target times, six targets inside the envelope, whole-degree bearings, integer power, and remaining tools. Intersections with either moving debris box disqualify the path before capture. Rank successful routes by fewest throws, then remaining Δv and flight time. The fastest-time table instead uses the fastest legal option regardless of budget. These counts describe the tested grid.
- **Reactive pilot.** The pilot reads the current coast and 3D miss direction, starts with a 95% outward battery throw, holds a forecast close pass and aims braking throws along drift. Per-decision heading and elevation errors range up to 6°, power error up to four points, and trim-magnitude error up to 40%. Manual decisions cost 4–12 seconds, with seven additional seconds to compare seven Preview settings when enabled. It uses the game’s avoidance suggestion with Coach, or tries a sideways pitch on its own. Story pauses deliberation. It learns no route across retries.
- **Review simulator.** The separate Random Drift skill study uses the review’s original 200 E seeds, three attempts, four assumed skills and matching random draws. Pilots use the final 30-second braking window. Firm uses the review’s scaled brake target for each skill. Optional alignment changes braking accuracy. The comparative adapter sends Soft and Firm to the v0.4 flight queries while leaving seed generation intact.
- **Human playability.** The browser suite exercised desktop and phone-sized viewports. The simulations cannot tell whether a first-time player recognizes the correct edge arrow, watches the other piece after a dodge, or can judge a brake on a touch screen. A useful human follow-up is the same orbital near-frame seed, Soft and Firm in alternating order, recording collision, tools left and when the pilot first noticed the fast entry.

Use checkout `30da793` and Node 18 or newer to reproduce these historical results. The current checkout runs the studies on F1 openings. Each command emits one JSON record per cohort. The first four commands run from this checkout alone. The optional `review` comparison also requires the original third-party `humans.cjs` simulator. The retained research materials include that simulator, the five cohort outputs and the summarizer used to assemble the CSV.

```sh
node studies/capture-speed.cjs catalog
node studies/capture-speed.cjs routes
node studies/capture-speed.cjs breadth
node studies/capture-speed.cjs pilots
node studies/capture-speed.cjs review /path/to/fastball-3d-gameplay-sim/humans.cjs
```

[Cohort results, including both inventories, loss causes, grab speed, elapsed time and paired changes](capture-speed-results.csv) · [Current catalog qualification](random-dodgeball-study.md)
