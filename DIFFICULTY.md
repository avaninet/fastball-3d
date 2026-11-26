# Difficulty assessment for the ten-minute reserve

**Playtest recommendation.** Keep the ten-minute clock and the directional hints. Trial a longer, faster opening specifically for **Random drift · Orbital · Manual · Require a soft capture**. On the current settings, the hint-following pilot rescued Tommi on 115 of 128 openings, usually with four tools and over four minutes of oxygen remaining. On a second set it won 121 of 128. A single straight-back battery throw is already a poor shortcut on these seeds. The forgiving part is how much room remains to read the miss and correct it.

## How the modes compare today

Each row uses the same 128 generated `D-` seeds. The two win columns use the same opening pitch, braking rule, power estimates and clock. The comparison pilot aims subsequent trims straight away from the station. The hint pilot interprets the visor’s directional words. These are automated strategies.

| Setup | Grab rule | Wins using trim directions | Wins aiming trims straight back | Median throws on hint wins | Median grab time on hint wins |
| --- | --- | ---: | ---: | ---: | ---: |
| Manual Straight-Line | Any speed | 128 | 55 | 3 | 5:52 |
| Manual Straight-Line | Soft | 128 | 26 | 4 | 6:09 |
| Manual Orbital | Any speed | 128 | 61 | 4 | 5:18 |
| Manual Orbital | Soft | 115 | 24 | 4 | 5:46 |
| Story Straight-Line | Any speed | 128 | 117 | 3 | 4:23 |
| Story Straight-Line | Soft | 128 | 85 | 3 | 4:27 |
| Story Orbital | Any speed | 128 | 115 | 3 | 4:07 |
| Story Orbital | Soft | 128 | 77 | 3 | 4:22 |

**First rescue** should remain dependable. Its staged pitch and halfway check teach recoil and how to recognize a safe coast. On the three named openings the hint pilot won all model and capture-rule combinations. Their roles are distinct. In manual Straight-Line soft capture, Tether separation took one throw, Lateral drift took three, and Wide separation took two with only about three seconds of oxygen left. On that same Wide opening the planner found a soft grab around 5:36. A close finish can reflect the chosen strategy as well as the geometry. The original plain-hex seed family also stayed forgiving, with 128 of 128 hint wins on manual Orbital soft capture.

## What makes the hard case harder?

**Time alone accounts for little of the current win rate.** Holding today’s geometry and rack fixed and cutting the deadline from 10:00 to 7:30 changed manual Orbital soft hint wins from 115 to 111. On the second set the change was 121 to 119. The planner found a return on every current opening at either deadline.

**Distance and transverse speed do different jobs.** Starting 35% farther from the bars raised the first set’s median hint finish from 5:46 to 6:52, with 108 wins. Multiplying drift speed by 1.8 at the original distances cut wins to 50, but the median fastest route found was still 4:06. Tilting the velocity outward while preserving its magnitude gave 119 hint wins. Making the drift point more directly away can make a straight-back throw *easier* to interpret. Longer gaps create clock pressure. Substantial sideways motion makes the opening throw, trim and brake compete for inventory.

## Two candidates for a local playtest

All rows below use the second set of 128 seeds, the ten-minute clock, manual Orbital flight, nine tools and soft capture. Times and tool counts are medians among successful runs. The two planner medians summarize different searches per seed. A fast route can cost more tools than an economical one.

| Opening | Exact planned wins | Planned wins with execution error and one replan | Hint wins | Fewest tools found | Fastest grab found | Tools / finish on hint wins |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Current | 128 | 127 | 121 | 2 | 4:07 | 4 / 5:24 |
| 54–77 m gap | 126 | 114 | 33 | 4 | 7:53 | 7 / 9:11 |
| **57–81 m gap** | **121** | **102** | **25** | **5** | **8:21** | **7 / 9:33** |

**Try the 57–81 m band first for the intended hard mode.** Multiply the current gap to the nearest bars by 2.65 and clamp it to that band. Multiply the starting velocity by 1.6 and add 0.055 m/s pointing away from the station center along the original bearing. This preserves different crossing directions. In the first sample it gave speeds of 0.057–0.217 m/s and a median angle of about 67° from directly outward. The gentler candidate uses a 2.45 distance multiplier, a 1.55 velocity multiplier and a 0.040 m/s outward addition.

The harder candidate produced a useful spread. On the second set, 65 openings had a successful route but none under five throws in this search. On 31 of those, even the fastest route found finished in the last minute. The directional hint pilot won 25 times against one win for straight-back trims. On the first set, exact plans won 119 times, the imperfect pilot with a replan won 95, and the hint pilot won 14. Those results support a mostly reachable challenge. How often a practiced human gets home, and whether the losses feel fair, still need playtesting.

## Queued human playtest

1. After cockpit review, compare the current geometry with both candidates on matched seeds. Alternate which geometry pilots see first. Give each pilot a replay so a second attempt can show what they learned. Keep the hint wording fixed for this comparison.
2. Record capture, oxygen remaining, tools spent, recovered delta-v and grab speed. On a loss, ask when the pilot first saw the problem and what they expected the next throw to do. On a win, ask which decision saved the flight. A long coast after an obvious first pitch creates a different experience from choosing whether to spend the last light tool on a trim or save it for braking.
3. Aim for a majority of practiced pilots to get home and for some wins to use six to eight tools with under a minute left. If players repeatedly recognize the right correction but cannot afford it, try the 54–77 m band. If success comes from repeating the words without reading range, time or drift, test delaying the directional hint until a course check. Keep the projected contact, miss and fast-entry warnings available.
4. If a balance change ships, version the random opening or seed family so shared challenges keep their original geometry. Preserve the named starts and Story lesson for comparison.

## Reproduce the assessment

Run `node tests/difficulty.cjs` from the repository. The study applies candidate geometry in memory. The measurements below use the preserved `D-` family. From v0.2, newly generated `E-` seeds also reject candidates that coast into the bars without a throw anywhere in the full ten minutes.

- The first set uses 128 consecutive seeds beginning at decimal 104729. The second uses 128 starting at hexadecimal 726800 with a stride of 1543. Both sets use the actual nine-tool recoil, Orbital propagator, station envelope and in-volume soft-grab rule.
- The hint pilot opens with the 95% battery facing away. Manual lineup costs 12 seconds and Story permits a staged pitch. Story pilots can repeat any tool at full-rack mass. The pilot checks misses after 18 seconds, interprets the game’s up/down/left/right/behind words in its current view, and estimates correction strength from clearance and time to closest pass. For a fast approach it attempts a brake along measured drift. Aim and power are precise. Choosing the power and timing are capabilities of this pilot, beyond the words in the hint. The comparison changes only the bearing used for a trim.
- The planner searches arrival times, interior targets, integer bearings and whole power percentages. It can spend additional tools at 12-second intervals and brake near entry. An additional trial perturbs every planned throw within a 3° cone and by up to three power points, with one chance to plan again using the remaining tools, time and perturbed state. The same perturbation stream is used across paired variants. A failed search leaves reachability unresolved. A successful route proves that opening can be flown under the stated assumptions.
