# Fastball 3D v0.1 · Local flight review

[Play the standalone build](index.html) · [Example Orbital flight log](reference/orbital-flight-log.png)

Manual flight now gives Tommi ten minutes and nine throws. The extra tools raise the full-rack velocity-change budget from 0.329 to 0.456 m/s. A player can spend a light tool to trim a miss or keep a second substantial impulse for a return. Story retains its 7:30 clock and the shorter teaching separations.

## Three first-play priorities

The cockpit now keeps the pitch controls together and describes the committed coast after a throw. The largest remaining uncertainty is how readily a first-time pilot turns that feedback into a useful next pitch. These findings come from reviewing and exercising the build. Human first-play sessions are still outstanding.

| Priority | Where a first-time pilot can get stuck | Next improvement and playtest |
| --- | --- | --- |
| 1. Teach the first turn before oxygen starts | The visor opens facing the station. A pitch directly at it pushes Tommi farther away. On a phone, turning around can take several drags and the player temporarily loses sight of the target. | Preview one throw and its opposite recoil in the briefing. Point out the aft camera before asking the pilot to turn. Then ask a new pilot to explain where the battery and suit will go before pressing Throw. |
| 2. Explain the difference between getting closer and getting a grab | Negative range rate means the gap is shrinking. Sideways velocity can still carry Tommi past the station, and total speed at entry determines a soft grab. The amber gauge mark is a reference during an any-speed flight. | Show a side-by-side example of a clean entry and a near miss with the same closing rate. Ask the pilot to predict each outcome from Current coast and explain when the 0.080 m/s mark matters. |
| 3. Connect the miss report to one affordable correction | A report such as “above the orbital plane” names the miss in station coordinates. The pilot must translate that into a visor bearing, a tool and a power setting. The aft view changes the apparent screen direction. | At the first oblique miss, annotate the predicted pass side in both cameras and explain how a light pitch toward that side moves the suit away from it. Record the pilot’s chosen bearing, remaining delta-v and time to the first useful trim. |

## Clock, rack and endings

The gap from the nearest point of the capture envelope increases by one third for manual flights. This scales the initial distance with the increase from 450 to 600 simulated seconds. The envelope, initial drift velocities and soft-capture threshold retain their previous values. Standard retries restore the same scaled opening. Story replays restore the original opening. Skipping guidance during a flight extends the deadline to 10:00 elapsed and keeps the current position and velocity.

| Opening | Story initial clearance | Manual initial clearance | v0.1 soft route, Straight-Line / Orbital | Prior soft route, Straight-Line / Orbital |
| --- | ---: | ---: | --- | --- |
| Tether separation | 18.13 m | 24.18 m | 7:19 / 7:31 | 5:24 / 5:26 |
| Lateral drift | 16.52 m | 22.03 m | 7:19 / 7:17 | 5:26 / 5:21 |
| Wide separation | 27.36 m | 36.47 m | 8:38 / 8:38 | 6:25 / 6:27 |

Times are rounded and describe the first nominal route found by the same planner. Wide separation still uses two throws under both models. Each named soft route uses about the same fraction of the available clock as before.

| New slot | Item | Mass | Full-power recoil from a full rack | Use |
| --- | --- | ---: | ---: | --- |
| 7 · Light | Tether clip | 0.4 kg | 0.0147 m/s | Small late trim |
| 8 · Medium | Inspection lamp | 1.5 kg | 0.0425 m/s | Sideways correction or modest brake |
| 9 · Heavy | Camera housing | 3.2 kg | 0.0673 m/s | Larger change of course |

The rack reports inventory and remaining delta-v. The selected tool reports its weight class and recoil at the current power. Each release reduces suit mass, so the same tool delivers slightly more recoil later in a flight.

An empty rack with no predicted intersection during the remaining oxygen time opens **Out of tools** at the last release. The debrief explains the forecast and the log ends at the actual decision time, with oxygen remaining. If a crossing lies ahead, the sim flies to it. A final over-speed soft entry is recorded at its actual time. When another entry is possible, the coast continues.

## Random reachability and difficulty

The comparison uses the same 128 generated `D-` seed numbers beginning at decimal 104729, the same planning method, and the previous build at `164cc05`. Straight-back repeats use the battery, then the drill and pouch at 60 and 120 seconds when needed. Planned routes select release bearing, equipment and power from the simulated 3D state.

| Strategy on 128 generated openings | Previous Straight-Line / Orbital | v0.1 Straight-Line / Orbital |
| --- | --- | --- |
| Face away, 95% battery, any speed | 11 / 5 | 5 / 5 |
| Repeat straight back, any speed | 30 / 34 | 25 / 26 |
| Repeat straight back, soft capture | 1 / 1 | 1 / 1 |
| Planned soft return | 128 / 128 | 128 / 128 |
| Planned soft return after 30 seconds of drift | 128 / 128 | 128 / 128 |

The v0.1 planner also found a soft return on **256/256 independent generated openings in both models**. That set started at hexadecimal 726800 and advanced by 1543 for each seed. In the dedicated fast-entry exercise, nominal braking and post-pass return both succeeded on 96/96 cases in each model. With up to 5° and five power points of recovery error, the post-pass return succeeded on 95/96 Straight-Line and 94/96 Orbital cases.

## How much throw error is tolerable?

**Start an optional accuracy setting at a maximum deviation of 2–3°. Try 5° as an experienced-pilot setting.** The shipped game keeps deterministic throws. At 3°, even the stricter Orbital soft route succeeded on 482/512 opening plans (94%); at 5° that fell to 435/512 (85%). At 10°, the same pilot needed a course correction on roughly two out of five soft flights.

Each nonzero row uses four paired trials on each of 128 generated openings. Each throw draws independently and uniformly by solid angle inside a cone around the intended direction, with exact player power. The number in degrees is the cone’s maximum deviation from the intended bearing. Each cell shows opening-plan wins → total wins with one opportunity to replan, out of 512 flights. A plan can contain multiple equipment releases.

| Maximum deviation | Straight-Line, any | Orbital, any | Straight-Line, soft | Orbital, soft |
| --- | ---: | ---: | ---: | ---: |
| 2° | 508 → 512 | 507 → 512 | 499 → 512 | 494 → 512 |
| 3° | 503 → 512 | 498 → 512 | 490 → 512 | 482 → 512 |
| 5° | 491 → 512 | 465 → 512 | 464 → 512 | 435 → 512 |
| 8° | 433 → 512 | 408 → 512 | 385 → 511 | 355 → 510 |
| 10° | 388 → 512 | 361 → 511 | 320 → 506 | 298 → 505 |
| 15° | 275 → 512 | 236 → 507 | 203 → 500 | 191 → 492 |
| 20° | 176 → 499 | 161 → 485 | 128 → 456 | 123 → 454 |

At 0° every generated opening had a winning plan under either rule and model. The correction pilot can read the exact 3D state and receives a timely course check. Those advantages matter most at larger error angles. Human tolerance for a pitch missing its intended bearing still needs a hands-on test.

## Cockpit and verification

The aft view is taller and takes a larger share of the desktop camera width. The play-speed slider covers 1× to 30× in one-unit steps. A release returns the clock to 1×. The relative-speed bar marks 0.080 m/s and identifies whether the mark is a reference or an active soft limit. The instruments show signed radial, along-track and cross-track velocity in m/s, and the mass of the suit and remaining gear.

The browser suite exercises all nine keyboard slots, early debrief, a valid last-tool intercept, a final fast pass, both reserve lengths, slider timing, gauge states, signed velocity, Story lessons, release history and backdrop dismissal, including the nested flight log. It also checks the core cockpit controls against four actual CSS viewports, including 390 × 844 portrait and 844 × 390 landscape. The balance harness and browser runner can be reproduced from the [README](README.md).
