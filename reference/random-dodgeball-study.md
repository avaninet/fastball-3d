# Random Dodgeball seed catalog

Random Dodgeball ships 4,096 qualifying DB1 openings drawn from 45,654 candidates. The first 1,000 reproduce the earlier local catalog exactly. Every seed fixes a distinct pair of debris positions and velocities. Tommi starts with the fixed incident's position, velocity and 600 seconds of oxygen. Manual flight starts with nine consumable tools, and Story reloads each tool after a release.

## How the openings were selected

The generator moves each piece's centre by up to 2.2 m radially, 2.8 m along track and 1.3 m across the orbital plane. It adjusts the velocities around a cover encounter at 77 ± 6 seconds and a frame crossing at 270 ± 18 seconds. Independent velocity jitter adds variation. The validator uses the game's own Straight-Line and Orbital propagation and its 4 cm padded boxes. Both models must pass each check.

- Both debris pieces must fit the opening view window with a visible gap from the projected grab envelope.
- For the first 90 seconds of untouched coast, Tommi's suit must stay at least 1 m from both boxes.
- On a reference approach, the cover must threaten impact with at least 45 seconds available. On the reference detour, the frame must threaten impact with at least 70 seconds available.
- A three-throw manual route must reach soft capture within nine minutes with at least 0.25 m between the suit and either box. The clearance thresholds include an extra 0.012 m for closest-pass search precision.
- At least 14 of 16 perturbed versions of the route must also reach soft capture per model. Each release varies by up to three degrees of aim, three power points and five seconds of flight time.

Opening visibility accounted for 35,798 rejections. Another 4,998 missed the intended encounter sequence, and 762 failed the nominal route. All 4,096 selected seeds were then flown with 32 additional combinations of execution errors in each mode.

| Held-out manual soft captures | Successful flights | Success rate | Lowest single-seed result |
| --- | ---: | ---: | ---: |
| Straight-Line | 129,505 / 131,072 | 98.8% | 29 / 32 |
| Orbital | 130,758 / 131,072 | 99.8% | 27 / 32 |

The trials used the same execution errors across seeds so differences reflect the debris placement. These openings vary one encounter family and share a known three-throw solution per physics model. Human route discovery and perceived variety still need playtesting.

## Reproducing the catalog

Run these commands from the project directory. The first writes the catalog. The second reads the saved positions and velocities and renders an Orbital soft capture through the game's flight-card code.

```sh
node studies/dodgeball-catalog.cjs Dodgeball-4096-Seeds.json 4096 assets/dodgeball-seeds.json
node studies/dodgeball-card.cjs Dodgeball-4096-Seeds.json example.svg DB1-007C5282
```

The study report stores each code, both pieces' full-precision initial XYZ positions in metres and velocities in m/s, and per-mode selection and holdout counts. The standalone game embeds only the approved numeric IDs and the DB1 generator. Each new opening chooses an ID uniformly and reconstructs the two states. The flight loop runs the regular debris physics. The replay fragment carries the DB1 code, flight model, capture goal and Story setting. The seed field recognizes either random scenario.

## Reading the approach charts

Tommi follows the solid mint path. The orange long dashes trace the cover and the violet dots trace the frame. Arrowheads follow each object's direction of travel. Each row in the key gives the smallest three-dimensional gap between the suit and that piece's collision box, plus the elapsed time at that pass. Two paths can cross in the V-bar/R-bar projection at different times or heights. Both Dodgeball scenarios show their flight's debris on both log projections. The flight card uses the orbital-plane projection.
