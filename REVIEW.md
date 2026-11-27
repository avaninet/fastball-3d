# Fastball 3D v0.4 · Flight review

[Play the standalone build](index.html) · [Example Orbital flight log](reference/orbital-flight-log.png)

Every flight gives Tommi ten minutes of oxygen. Manual flights allow nine throws. Story tools reload immediately at constant suit and gear mass. The extra tools raise the full-rack velocity-change budget from 0.329 to 0.456 m/s. A player can spend a light tool to trim a miss or keep a second substantial impulse for a return. Story uses shorter separations in the drift scenarios. Each Dodgeball opening uses the same geometry in manual and Story flight.

## November 26 audit follow-up

The review used v0.2 commit `1089b69`. The v0.3 checkout already included the compact cockpit, assisted scoring after Skip guidance, keyboard-layout support, capped replay input, accessibility labels, CSP hashes and pinned CI actions. Version 0.4 builds on the Dodgeball commit `54318bf`.

The [capture-speed playtest](reference/capture-speed-playtest.md) compares Soft (0.080 m/s) and Firm (0.120 m/s) on all six v0.4 scenarios in both flight models. It reports routes, rescue rates and remaining manual delta-v, including results for each of the eight Random Dodgeball layouts.

A 35-throw Story approach now forecasts and records the same high-speed Orbital capture. In First rescue, throwing the first battery toward the station leads to a staged full-power recovery and a second correction that reaches the bars. Turning, selecting a tool or changing power updates the lesson cue. Completed flights show the outcome. Wide separation and the coast readout now agree about which way the suit is drifting.

## Three first-play priorities

The cockpit now keeps the pitch controls together and describes the committed coast after a throw. The largest remaining uncertainty is how readily a first-time pilot turns that feedback into a useful next pitch. These findings come from reviewing and exercising the build. Human first-play sessions are still outstanding.

| Priority | Where a first-time pilot can get stuck | Next improvement and playtest |
| --- | --- | --- |
| First pitch | On Tether separation the visor opens facing the station. The first manual recoil note beside Throw shows whether the pitch pushes the suit toward the station, away or sideways. DB2 frames the two debris pieces with the station. | Before release, ask where the battery and suit will go. Check whether a new pilot finds the station in the aft view after turning. |
| Contact speed | Range rate can be negative even on a miss. The gauge shows current speed and the selected limit. Current coast gives projected entry speed. | Give the pilot a 0.100 m/s entry and ask what happens under Any-speed, Firm and Soft. Then check whether the pilot can line up a brake during the final 30 seconds. |
| First trim | A future miss can supply an aiming direction and an estimated recoil. At a pitch stop, the hint can give a horizontal heading. | Ask the pilot to choose a tool and power that match the estimate. In Dodgeball, record whether the pilot checks both debris clearance and the resulting station pass. |

## Clock, rack and endings

The four drift scenarios start one third farther from the nearest grab bar in manual flight than in Story. Both Dodgeball scenarios use the same geometry in either inventory. A standard retry restores the opening and grab rule and keeps the current Preview and Coach choices. Skipping lesson guidance keeps the remaining oxygen, position, velocity and release log. The debrief records an assisted result. Retry after skipping opens a fresh manual flight.

| Opening | Story initial clearance | Manual initial clearance | v0.4 soft route, Straight-Line / Orbital | Prior soft route, Straight-Line / Orbital |
| --- | ---: | ---: | --- | --- |
| Tether separation | 18.13 m | 24.18 m | 7:19 / 7:31 | 5:24 / 5:26 |
| Lateral drift | 16.52 m | 22.03 m | 7:19 / 7:17 | 5:26 / 5:21 |
| Wide separation | 27.36 m | 36.47 m | 8:38 / 8:38 | 6:25 / 6:27 |

Times are rounded and describe the first nominal route found by the same planner. Wide separation still uses two throws under both models. Each named soft route uses about the same fraction of the available clock as before.

| Rack slot | Item | Mass | Full-power recoil from a full rack | Use |
| --- | --- | ---: | ---: | --- |
| 1 · Light | Tether clip | 0.4 kg | 0.0147 m/s | Small late trim |
| 5 · Medium | Inspection lamp | 1.5 kg | 0.0425 m/s | Sideways correction or modest brake |
| 7 · Heavy | Camera housing | 3.2 kg | 0.0673 m/s | Larger change of course |

The rack reports inventory and remaining delta-v. The selected tool reports its weight class and recoil at the current power. Manual releases reduce total mass, so a tool delivers slightly more recoil if thrown later. Story reloads keep the mass constant.

After the last manual release, the remaining forecast decides whether a grab is possible. A miss ends as **Out of tools** and an unavoidable overspeed under Firm or Soft ends as **Too fast to grab**. In either case the log stops at release. A later eligible entry or an Orbital slowdown inside the bars keeps the coast live. A forecast debris collision runs to impact. Both visors fade on a loss and the debrief follows after 1.35 seconds. A brake inside the bars can earn an immediate grab, including on the last throw.

## Random reachability and difficulty

The comparison uses the same 128 generated `D-` seed numbers beginning at decimal 104729, the same planning method, and the previous build at `164cc05`. Straight-back repeats use the battery, then the drill and pouch at 60 and 120 seconds when needed. Planned routes select release bearing, equipment and power from the simulated 3D state.

| Strategy on 128 generated openings | Previous Straight-Line / Orbital | v0.4 Straight-Line / Orbital |
| --- | --- | --- |
| Face away, 95% battery, any speed | 11 / 5 | 5 / 5 |
| Repeat straight back, any speed | 30 / 34 | 25 / 26 |
| Repeat straight back, soft capture | 1 / 1 | 1 / 1 |
| Planned soft return | 128 / 128 | 128 / 128 |
| Planned soft return after 30 seconds of drift | 128 / 128 | 128 / 128 |

The v0.4 planner also found a soft return on **256/256 independent generated openings in both models**. That set started at hexadecimal 726800 and advanced by 1543 for each seed. In the dedicated fast-entry exercise, nominal braking and post-pass return both succeeded on 96/96 cases in each model. With up to 5° and five power points of recovery error, the post-pass return succeeded on 95/96 Straight-Line and 94/96 Orbital cases.

## How much throw error is tolerable?

**Start an optional accuracy setting at a maximum deviation of 2–3°. Try 5° as an experienced-pilot setting.** The shipped game keeps deterministic throws. The Orbital soft route succeeded on 484/512 opening plans at 3° (95%) and 437/512 at 5° (85%). At 10°, the same pilot needed a course correction on roughly two out of five soft flights.

Each nonzero row uses four paired trials on each of 128 generated openings. Each throw draws independently and uniformly by solid angle inside a cone around the intended direction, with exact player power. The number in degrees is the cone’s maximum deviation from the intended bearing. Each cell shows opening-plan wins → total wins with one opportunity to replan, out of 512 flights. A plan can contain multiple equipment releases.

| Maximum deviation | Straight-Line, any | Orbital, any | Straight-Line, soft | Orbital, soft |
| --- | ---: | ---: | ---: | ---: |
| 2° | 508 → 512 | 507 → 512 | 499 → 512 | 496 → 512 |
| 3° | 503 → 512 | 498 → 512 | 490 → 512 | 484 → 512 |
| 5° | 491 → 512 | 465 → 512 | 464 → 512 | 437 → 512 |
| 8° | 433 → 512 | 408 → 512 | 385 → 511 | 358 → 509 |
| 10° | 388 → 512 | 361 → 511 | 320 → 506 | 299 → 504 |
| 15° | 275 → 512 | 236 → 507 | 203 → 500 | 192 → 492 |
| 20° | 176 → 499 | 161 → 485 | 128 → 456 | 124 → 453 |

At 0° every generated opening had a winning plan under Any-speed and Soft in both flight models. The correction pilot can read the exact 3D state and receives a timely course check. Those advantages matter most at larger error angles. Human tolerance for a pitch missing its intended bearing still needs a hands-on test.

## Cockpit and verification

The aft camera sits in the upper-left corner of the forward visor. The translucent instruments and equipment rack leave the scene visible beneath their labels. Released slots fade. The dashed mint coast shows committed motion and the optional violet path previews the selected throw. The play-speed slider has four stops at 1×, 10×, 20× and 30×. A release returns the clock to 1×. The relative-speed gauge marks the selected Firm or Soft limit. In Any-speed it marks 0.080 m/s as a reference. The instruments show signed radial, along-track and cross-track velocity in m/s, and the mass of the suit and remaining gear.

Browser checks verify that miss hints follow the forward visor in both flight models. Two nine-release flights test the spacing of numbered callouts in both log projections, including throws made at almost the same position.

The browser suite exercises all nine keyboard slots, early debrief, a valid last-tool intercept, a final fast entry, the shared ten-minute reserve, slider timing, gauge states, signed velocity, Story lessons, release history and backdrop dismissal, including the nested flight log. It also checks the core cockpit controls against four actual CSS viewports, including 390 × 844 portrait and 844 × 390 landscape. The browser suite also checks tablet rack labels at 768 and 1024 px and header bounds down to 320 px. Follow the [README](README.md) to run the balance and browser checks.

The browser suite covers the scenario selector, Firm grabs at entry and inside the bars, brake timing, manual Face drift and aid records. It also reproduces the 35-battery Story approach in Orbital, follows a wrong-way First rescue pitch through to capture, edits a staged pitch, distinguishes outward drift from a past flyby, operates cockpit shortcuts with sliders and checkboxes focused, and resumes after a simulated paint failure. Short-screen checks cover both First rescue and manual controls at nine sizes, including 1366 × 625, 1280 × 600, 1024 × 650, 375 × 553 and 320 × 568. The fixture supports the DejaVu fonts used by Linux CI and exercises an Arial/Courier fallback. The legacy tap checks exercise mouse and touch releases followed by a plain mouse click. Physical iPhone and iPad taps still need a device test. Two last-tool Orbital tests coast to a soft grab at 1× and 30×. One slows before entry. The other enters fast and slows to capture speed inside at 43.847572 s.

The balance harness checks the first crossing on all six faces at 1.5, 3, 8 and 12 m/s with Any-speed and Soft. The Dodgeball suite checks debris collisions and routes home. The station check verifies all 28 parts and their mounting faces. The browser suite exercises GPU and software Earth projection, camera occlusion and the released-tool sprites. Native browser coverage includes Space activation, clipboard fallback and PNG export. The flight log and share-card examples were recaptured from the four-release, soft-capture Orbital flight on seed D-00019919.

In the earlier 81-check audit, Windows Chrome 158 passed at all four viewports with the native font stack and again with embedded DejaVu Sans and DejaVu Sans Mono. Native Chrome input checks also covered mouse focus, a single Enter release, slider arrows and checkbox Space. Clipboard fallback and flight-card PNG export passed. Physical-device testing remains open. [GitHub Actions checks](https://github.com/avaninet/fastball-3d/actions/workflows/check.yml)
