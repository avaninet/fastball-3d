# Random Dodgeball seed catalog

Random Dodgeball offers 4,096 openings, distributed evenly across eight pairs of debris starting positions. A DB2 code restores the service cover and bent frame to the same full-precision positions and velocities. Tommi starts at station-relative XYZ (13.67, −24.80, 8.33) m, with 600 seconds of oxygen. The same seed works in Straight-Line or Orbital flight, in manual or Story, with any grab rule. The [capture-speed playtest](capture-speed-playtest.md) compares the Firm and Soft limits on these same openings.

## Eight opening layouts

The coordinates are the centres of the eight tested layouts, in metres. X is radially outward, Y is along track, and Z is perpendicular to the orbital plane. Speeds are the observed minimum and maximum initial speeds among the 512 **accepted** variations in each row. Position and velocity are coupled. Combining independent extremes from these ranges can produce an unqualified encounter.

| Layout | Cover centre XYZ (m) | Frame centre XYZ (m) | Cover speed (m/s) | Frame speed (m/s) | Example code |
| --- | --- | --- | --- | --- | --- |
| Left cover crossing | (-3, -13, -1.1) | (12, 0.8, 3.6) | 0.125–0.186 | 0.049–0.071 | `DB2-00000000` |
| Right cover crossing | (12.8, -4.3, 5.1) | (-4.8, -9.4, -4) | 0.100–0.163 | 0.034–0.059 | `DB2-00100001` |
| High cover crossing | (-0.4, -5.7, 9.9) | (11, -2.7, -1.6) | 0.101–0.161 | 0.044–0.068 | `DB2-00200001` |
| Low cover crossing | (10.8, -2.7, -1.8) | (-5.6, -6.4, 9.5) | 0.103–0.154 | 0.043–0.067 | `DB2-00300000` |
| Far frame crossing | (14.6, -4.6, 2.3) | (-14.9, 0.7, 1.7) | 0.066–0.086 | 0.287–0.378 | `DB2-00400002` |
| Near frame crossing | (-5.3, -0.5, 9.7) | (12.7, -10.6, 1.5) | 0.084–0.112 | 0.067–0.119 | `DB2-00500007` |
| Upper frame crossing | (-4.9, -12.1, 0.4) | (9.7, 0.9, 5.6) | 0.057–0.078 | 0.109–0.165 | `DB2-00600000` |
| Lower frame crossing | (11.9, 1.2, 6) | (-3.1, -6.4, -10) | 0.048–0.066 | 0.137–0.199 | `DB2-00700000` |

On a direct reference approach, the first four layouts bring the service cover across Tommi's path. The frame crosses her detour. The last four reverse the order. In the far-frame layout the frame starts about 39 m from her and moves quickly across the station face. In the near-frame layout it starts about 16 m away at a much lower speed. Each layout has its own detour bearing and return pitch. Players can discover other routes.

## Qualification

Both the central states and every admitted variation passed the following checks in the game's Straight-Line and Orbital models.

- The two silhouettes start apart from each other and from the projected grab envelope. The opening visor frames the debris and station centre around the cockpit panels.
- The initial unpowered coast gives Tommi at least 1 m of suit clearance for 90 seconds. Both debris boxes clear the station assembly and each other throughout the ten-minute flight. The offline test conservatively encloses each station part and the moving debris in world-axis boxes and bounds travel continuously between samples.
- The reference approach predicts a hit with at least 45 seconds of lead time. After the detour pitch, the other piece threatens a hit at least 70 seconds ahead.
- A three-throw route reaches the bars at or below 0.080 m/s within nine minutes in both manual and Story inventories. The suit clears both padded debris boxes by at least 0.25 m. Closest-pass checks include a 0.012 m search margin.
- At least 14 of 16 perturbed manual flights per model must reach soft capture. The pilot varies each release by up to three degrees of aim, three power points and five seconds. The catalog retains exactly 512 passing IDs for each layout.

The candidate generator offsets each piece by up to 2.0 m in X, 2.6 m in Y and 1.5 m in Z. It adjusts the velocity to cross near that layout's reference point, varies the reference crossing time by up to 6.5%, and adds independent component jitter up to (0.003, 0.002, 0.002) m/s. The eight crossing geometries and the different detour pitches give the catalog its wider spread.

The search examined **10,816 candidate pairs**. After selection, the automated pilot flew 32 previously unused combinations of execution errors for each accepted seed and model. The draws were shared across seeds to make the layouts comparable.

| Held-out manual soft captures | Successful flights | Success rate | Lowest single-seed result |
| --- | ---: | ---: | ---: |
| Straight-Line | 130,818 / 131,072 | 99.8% | 26 / 32 |
| Orbital | 128,154 / 131,072 | 97.8% | 25 / 32 |

These results measure tolerance while following a known route. Human pilots still need to judge how readily they can read each crossing and discover a route unaided.

## Browser measurements

In local headless Chrome at 1440 × 950 with GPU acceleration disabled, the median setup time across 64 Orbital openings was 4.0 ms. The first draw after framing a new view took 40 ms at the median and 60 ms at the 95th percentile. During 576 subsequent coasting updates, advancing the flight and drawing both visors took 4.6 ms at the median and 7.6 ms at the 95th percentile. The game targets a 32 ms redraw interval during flight.

## Reproducing the catalog

```sh
node studies/dodgeball-layouts.cjs DB2-study.json assets/dodgeball-layout-seeds.json
node studies/dodgeball-card.cjs DB2-study.json example.svg DB2-00500007
node scripts/build.cjs
npm test
```

The report records full-precision states, selection and holdout counts for every opening. The game embeds only approved IDs, eight reference layouts and the deterministic generator. Generating a flight selects uniformly from the 4,096 IDs and reconstructs its two pieces. Route searches and qualification run offline.

## Earlier DB1 replays

The original 4,096 DB1 codes still load the original single-family trajectories, including `DB1-007C5282`. That catalog accepted 4,096 of 45,654 candidates. Its held-out manual soft-capture totals were 129,505 / 131,072 in Straight-Line and 130,758 / 131,072 in Orbital. To reproduce the historical catalog, run the original study.

```sh
node studies/dodgeball-catalog.cjs DB1-study.json 4096 assets/dodgeball-seeds.json
```

## Reading the approach charts

Tommi follows the solid mint path. The orange long dashes trace the cover and the violet dots trace the frame. Arrowheads follow each object's direction of travel. Each row in the key gives the smallest three-dimensional gap between the suit and that piece's collision box, plus the elapsed time at that pass. Two paths can cross in the V-bar/R-bar projection at different times or heights. Both Dodgeball scenarios show their flight's debris on both log projections. The flight card uses the orbital-plane projection.
