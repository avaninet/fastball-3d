# F1 and F2 challenge catalogs and station tilt

Random Drift and Random Dodgeball each ship 4,096 distinct base openings. New flight chooses a row uniformly, then, if **Random station orientation** is selected, chooses uniformly among that row's approved tilts. With the option off, the station starts in its standard pose. Retry and shared codes restore the actual tilt. Each flight keeps that pose from separation to debrief. The three named debris-free scenarios offer all 16 tilts. The fixed Dodgeball Challenge offers six. Guided lessons use their authored station orientation.

## Sharing the starting conditions

`F1B-5011G7` loads Random Dodgeball row 2560, station tilt X -30° / Z -30°, Orbital motion, Soft capture, single-use inventory and both starting aids off. `F1B-5001GZ` loads the standard station with the same debris and rules. These make a matched pair for a first playtest.

A code contains the format prefix (`F1` or `F2`), scenario letter, hyphen, five most-significant-first base-32 digits and a check digit. The scenario letters are T (Tether separation), L (Lateral drift), W (Wide separation), D (Random Drift), C (Dodgeball Challenge) and B (Random Dodgeball). The alphabet is `0123456789ABCDEFGHJKMNPQRSTVWXYZ`. The decoder accepts either case. In the payload and check digit, O is read as 0 and I or L as 1.

| Payload bits | Meaning |
| --- | --- |
| 24–23 | Reserved, zero |
| 22–11 | Catalog row 0–4095. The four named scenarios use row 0. |
| 10–6 | Station pose 0–16. Pose 0 is standard. Each row has its own allowed nonzero poses. |
| 5 | Straight-Line 0, Orbital 1 |
| 4–3 | Any-speed 0, Firm 1, Soft 2 |
| 2 | Single-use inventory 0, Story inventory 1 |
| 1, 0 | Starting Preview and Dodgeball Coach, respectively. Coach requires a debris scenario. |

New sight-only starts use the F2 prefix with the same catalogs and payload. F2 selects Manual (no guidance) and requires both starting aid bits to be zero. F1 keeps its original meaning and check digit. The flight card records “Manual throughout” only for a flight created in Manual that kept navigation offline, including while staged or paused.

The check digit is CRC-5 over the uppercase ASCII prefix and five payload digits, excluding the hyphen. It uses polynomial x⁵+x²+1, MSB first, initial and final XOR zero. Decode checks the checksum, reserved values, scenario and pose permissions before launching. Opening a share link stages the flight so each player can start their own clock.

Each Drift row stores six little-endian float64 values and a 16-bit approved-tilt mask (50 bytes). Each Dodgeball row stores a 32-bit deterministic debris key and a 16-bit mask (6 bytes). Bit zero of either mask identifies pose 1. The two binaries total 224 KiB before base64 embedding. The standalone game reconstructs the selected row locally. A frozen row ordering, debris generator, tilt definitions and flight rules give F1 its meaning. Use a new version for revisions that change a code's challenge.

## Random Drift

The generator makes a deterministic pool of 16,384 starting positions and velocities. It divides the pool into four groups by velocity change needed for a 500-second transfer, then halves each group by lateral speed and again by 300-second orbital bend. Bend is the distance between Orbital and Straight-Line unpowered positions starting from the same single-use opening. It shuffles within each group and keeps 256 qualified openings from each of the 16 groups. Selection examined 4,100 candidates.

| Measure over the selected openings | Range |
| --- | ---: |
| Single-use transfer demand, taking the higher of the two models | 0.024–0.215 m/s |
| Initial speed perpendicular to the separation direction | 0.012–0.127 m/s |
| Orbital bend after 300 seconds | 0.09–18.95 m |
| Tools used by the nominal feedback pilot | 1–5 |

Every accepted opening passes in single-use and Story inventory and in both motion models. An unpowered entry into the bars at any point in 600 seconds disqualifies that opening or tilt. For powered recovery a pilot makes legal pitches, adjusting to the measured state between throws. Its target is within 1.59 m of the station centre at less than 0.079 m/s by 520 s. This sphere fits inside the grab envelope at every orientation. All 4,096 standard openings and 65,520 additional row/tilt pairs qualify. Sixteen of the possible tilted pairs would admit an unpowered catch.

Selection required 15 wins from 16 perturbed trials per configuration. In a separate set of 16 trials per opening, model and inventory the pilot succeeded **262,144 / 262,144** times. Errors were up to 3° in heading and elevation, three power points and five seconds. In a separate comparison using 128 single-use Orbital Soft openings, a pilot following the on-screen directional hints won 117, while the same pilot trimming straight back toward the station won 28. This gives players a reason to read the approach.

## Random Dodgeball

Tommi always starts at station-relative (13.67, -24.80, 8.33) m, with 600 s of oxygen. The debris geometry supplies the variation. The first four layouts send the service cover across the reference approach and the frame across the detour. The last four reverse that order. Each layout has its own directions for pitching sideways and turning back. Each row reconstructs the positions and velocities of both pieces.

| Layout | Openings | Approved tilted pairs | Example tilted Orbital Soft code | Final audit, single-use Orbital wins / 8,192 |
| --- | ---: | ---: | --- | ---: |
| Left cover | 512 | 7,366 | `F1B-0011G0` | 8,173 |
| Right cover | 512 | 6,971 | `F1B-1011GA` | 8,179 |
| High cover | 512 | 6,977 | `F1B-2011GM` | 8,052 |
| Low cover | 512 | 7,252 | `F1B-3011GY` | 8,192 |
| Far frame | 512 | 6,938 | `F1B-4011GD` | 8,189 |
| Near frame | 512 | 6,765 | `F1B-5011G7` | 8,074 |
| Upper frame | 512 | 2,250 | `F1B-600SGS` | 7,585 |
| Lower frame | 512 | 2,115 | `F1B-700VGG` | 7,961 |

The candidate generator offsets the reference positions, adjusts velocities around the intended crossing and varies crossing time. Selection examined 10,852 pairs. Each approved row and pose meets these checks in **both motion models**.

- The opening view separates the pieces from each other and the grab envelope.
- The full ten-minute unpowered coast misses the bars. During the first 90 seconds, the suit has at least 1 m of clearance from either debris box. Across the shipped rows the smallest measured gap, allowing for the 0.012 m closest-pass search tolerance, exceeds **8.29 m**.
- Both pieces clear each other and the oriented station assembly throughout the flight. The reference approach gives at least 45 s of warning before the first threatened hit. After the dodge, the second threat gives at least 70 s of warning.
- Three legal pitches reach a Soft grab within nine minutes, with at least 0.25 m of suit clearance, in both single-use and Story inventory.
- Each row passes at least 14 of 16 perturbed single-use flights per model in standard orientation. Each approved tilt passes that test and an additional 30 of 32 perturbed flights per model. Errors vary aim by up to 3° within a cone, power by three points and release time by five seconds.

The upper-frame Orbital approach had the lowest error tolerance in the first pass. Tightening tilt admission replaced nine base openings and retained 4,087 of the previous 4,096 debris states. All rows offer 2–16 tilts (median 14), for **46,634 additional row/tilt pairs**. A 32-draw single-use check on one approved tilt per row landed 130,589/131,072 Straight-Line flights and 128,311/131,072 Orbital flights.

The **final audit** used a separate pool of 256 error patterns. It flew 16 patterns per row, model and inventory, half in the standard pose and half distributed among approved tilts. The checker reads the packed catalog and never changes it.

| Final audit | Straight-Line Soft | Orbital Soft |
| --- | ---: | ---: |
| Single-use | 65,419 / 65,536 (99.82%) | 64,405 / 65,536 (98.27%) |
| Story | 65,388 / 65,536 (99.77%) | 64,279 / 65,536 (98.08%) |

These rates describe errors while following a known route. The upper-frame Orbital opening remains a good human playtest of whether players can discover the detour. Compare it with the low-cover opening, then try the paired near-frame codes above to isolate how the angle changes the visible grab profile.

## Reproduction

From the repository root with Node 18 or newer:

```sh
node studies/curate-drift.cjs
node studies/station-orientations.cjs
node studies/station-orientations.cjs --audit
npm run build
npm test
npm run test:difficulty
```

The first two commands regenerate the shipping assets. The audit reports counts for each layout from those assets. The tests check the immutable catalog bytes, all valid challenge-code combinations, actual game geometry and inventory rules, and unpowered coasts. The four-viewport browser checks exercise setup, flight, hints, retry, logs and sharing. See the [station geometry](station-assembly.md), [debris geometry](debris-assembly.md) and [open playtests](playtests.md).
