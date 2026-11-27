# Throw preview on station approach

The violet path shows what would happen if the pilot threw *now*. Its starting position and the camera position must correspond to the same instant. Both visors and the readout share one prediction per paint. Dodgeball can reuse that prediction while the clock and throw controls stay fixed.

## Regression flights

In the fixed Dodgeball Challenge, throw the spare battery at 95% at separation. Hold the next tool without releasing it. The browser regression test records the pitch, camera bearing and flight time for each approach. It advances one flight second per paint, equivalent to a 30 Hz visor at 30×.

In a separate Chromium run, the original build (`beda791`) reversed the first visible violet arrowhead by more than 150° on 13 forward and 24 aft transitions in one real second of Orbital flight. In Straight-Line, the preview switched between its end-on diamond and an arrowhead 23 times forward and 18 times aft. The rebuilt game produced zero reversals or glyph switches in those windows at 1×, 10×, 20× and 30×.

## Forecast cost

Chromium 148 ran on Windows with a 390 × 844 CSS-pixel viewport, a device pixel ratio of 2 and DevTools CPU throttling. These timings characterize the tested browser and host. Physical mobile hardware can have different CPU, GPU and thermal limits.

The paired measurements call both predictors on the same flight state and alternate which runs first. Each CPU setting includes 1,080 timed predictions per build after warm-up. The clock advances at a 30 Hz paint cadence. The fixed and seeded (`DB2-00500007`) openings run at 1×, and the fixed station approaches at 30×, in both flight models. Timings include cache hits in the original build.

| CPU slowdown | Original mean preview time per paint | Fixed mean preview time per paint | Fixed preview time, 95th percentile |
| --- | ---: | ---: | ---: |
| None | 0.02 ms | 0.07 ms | 0.20 ms |
| 4× | 0.08 ms | 0.34 ms | 0.80 ms |
| 6× | 0.25 ms | 1.03 ms | 2.40 ms |

A separate 6× sweep timed `Debris.forecast` for the fixed challenge and one published seed from each of the eight Random Dodgeball layouts. It varied aim, tool and flight time in both models. Across 2,268 forecasts, including 156 predicted impacts and 21 clearances under 10 cm, the 95th percentile was 1.9 ms, the 99th percentile was 3.1 ms and the longest call took 6.9 ms.

Live cockpit runs also timed the preview inside the normal two-visor paint. Four opening cases covered both models in the fixed challenge and the near-frame seed. A fifth case used the fixed Orbital approach at 30×. Separate passes ran the two builds in both orders. A third pass alternated predictors in four blocks per case on the same page, with eight warm-up paints and 26 measured paints per block.

| CPU slowdown | Mean preview time per live paint, original → fixed, alternating blocks | Visor paints per second, original → fixed, alternating blocks |
| --- | ---: | ---: |
| 4× | 0.32 → 1.13 ms | 27.8 → 28.1 |
| 6× | 1.05 → 2.60 ms | 16.7 → 13.0 |

Whole-cockpit cadence varied more than the forecast timings. Across all three passes at 6×, the original averaged 16.7–21.9 visor paints per second and the fix averaged 13.0–23.0. Both builds fell below the 30 Hz target under heavy throttling.
