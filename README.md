# Fastball 3D v0.1

You have ten minutes of oxygen, nine tools and one job. Get Capt. Tommi Dylan back within reach of the station’s grab bars.

**To play offline**, download `index.html` and open it in your browser. The game, cameras and artwork are all in that file. [Game file](index.html)

**The tool goes through the forward crosshair. You recoil the other way.** On **Tether separation**, face away from the station before you throw. The tool will leave the forward visor and you can watch for the station in the aft camera. In the flight instruments, **Current coast** tells you whether you’ll reach the bars. If it says “Aim up and right,” that’s where to throw the *tool*. The recoil nudges your suit down and left relative to the same view.

## The service call

Private space contractor BOREX designed its first spacesuit for the people who would maintain fleets of commercial datacenter satellites. The lightweight suit gave a technician more freedom to maneuver, and its automatic return system was supposed to bring them home if they came loose. On the first outing, mission specialist Capt. Tommi Dylan (she/they) is making the orbital equivalent of a service call to cold-reboot an inference server. Yes, it takes all nine tools.

The tether parts. The thruster valves stick closed. An astronaut drifting away without a tether or working emergency thrusters is presumed lost. Station commander Julian Bern can still see her radar track. Tommi can still put a hand on the wrench pouch. Newton’s third law gives her one last option. Fling a wrench as hard as she can out into space and the wrench pushes her back.

It’s the night of the new moon. From here in Earth’s shadow, the planet hides both Sun and Moon. A few stars hang above the dark curve of Earth. Ten minutes of air. The station a little farther away with every second. Tommi looks down the throat of death and decides she’s going to pitch her way home.

Tommi broke Mach 10 in the classified SR-73, but the habit that comes back to her now is older than that. She was a high-school star pitcher. She still plays Saturdays with her friends, sometimes against a team from the next town. She fits her fingers around the handle as if it had seams, loosens them, then takes her grip again. On a dusty field in the bright sun, that’s the moment the crowd goes quiet for her. Out here the silence gives her a little room to breathe. She’ll need it.

The crew would like their drill back. It’s the only one aboard until resupply, and by now it’s practically Tommi’s pet. After the incident, NASA has a talk with BOREX about where to put its datacenters. Earth comes strongly recommended.

## Fly a first rescue

1. For a manual flight, leave **Tether separation**, **Straight-Line** and the default any-speed grab selected. **Begin flight** starts the clock and unlocks aiming. For a guided pitch with time to line up, choose **First rescue** in the header instead.
2. Turn the forward visor, choose a tool from the rack, set the power and press **Throw**. Turning your head only changes where the next tool will go. Your existing drift carries on.
3. Read **Current coast** after each throw. **Contact in** means your present path reaches the bars. You can keep the tools you have left and advance the clock. **Miss by** gives the clearance at the nearest pass and a direction for a correction. Try a light tool while the pass is still ahead.
4. Reach any part of the outlined **14 × 14 × 3.2 m** volume, including the gaps between panels. The grab happens automatically. You have **10:00** in every mode. After your last throw, a miss or an unavoidable overspeed ends the flight at release. Both visors fade to **GAME OVER**, then the debrief explains why. In Orbital, even a fast entry can still lead to a soft grab if you slow enough inside the bars. Let that coast play out.

## Choose the challenge

Use **New flight** to combine an opening, a flight model and a capture rule. **Story flight** adds assistance independently.

| Setting | What changes |
| --- | --- |
| Tether separation | A slow outward drift. A good place to learn which camera to watch after a throw. |
| Lateral drift | You’re sliding across the station face. Watch where you’ll pass even as the range shrinks. |
| Wide separation | You start farther out. An early throw buys time to spot and correct a miss. |
| Random drift | A seed fixes the starting position and velocity. Friends can fly the same opening. |
| Straight-Line / Orbital | In Straight-Line, velocity stays constant between throws. In Orbital, the path can bend relative to the orbiting station. Watch the committed coast. |
| Require a soft capture | Off by default. Turn it on to require **0.080 m/s or slower** within the bars. A fast entry carries you through. You can still brake inside the volume or come back around. |
| Story flight | A closer opening with **Face station**, **Face away** and **Face drift**. Line up before the clock starts or while paused. **Throw** starts or resumes flight at 1×. |

**First rescue** is the optional walkthrough with exact pitches. It stages a first throw, pauses for a halfway course check, then offers an oblique miss, a braking lesson and an Orbital comparison. **Skip guidance** hands you manual control of the current flight. **Retry** after skipping starts the standard manual opening with a full rack and a fresh clock. Replay the lesson anytime from **Guide**.

## Cockpit controls

| Action | Mouse, touch or keyboard |
| --- | --- |
| Look / aim | Drag the forward visor or tap a point to center it. Arrow keys turn 2°. Hold **Shift** for 0.25° steps. Use the **STN** cue to find the station when it’s off-screen. |
| Select equipment | Click or tap the rack, or press **1–9** in ascending weight order. After a release the lightest remaining tool is selected. |
| Set power and release | Drag **Throw power**, or use **[** and **]** for one percentage point at a time. Press **Throw**, or **Enter** with the forward visor focused. Each tool gets one release. |
| Preview the next throw | Tick **Preview throw** under **Current coast** in either flight model. The solid violet path shows where the suit would coast with this aim, tool and power. The dashed mint path shows where it’s already going. Turn the preview off at any time. |
| Pause / resume | Use the clock button or **P**. In manual flight you can read instruments while paused and resume to aim. Opening **Guide** or **New flight** pauses a running flight. Close the dialog and press **Resume** when ready. |
| Speed up a coast | Drag **Play speed** to **1×**, **10×**, **20×** or **30×**. Every throw resets it to 1×. A clock interruption longer than one real second pauses the simulation. |

## Read the approach

- **Look for the miss early.** The mint marks in both cameras trace your committed coast. The brighter, thicker dashes are closer to your suit. Arrowheads get smaller with distance. Looking straight down a Straight-Line coast, you see a ring with the distance to contact or to your predicted position at oxygen expiry. Read the time and distance in **Current coast** to tell a future pass from one already behind you. Its aiming hint follows the forward visor as you turn.
- **Check speed as well as distance.** A negative **Range rate** means the gap to the nearest bars is shrinking. You can still slide past them sideways. **Relative speed** includes motion in all three directions. The gauge marks the soft-capture threshold, and the velocity panel below breaks the motion into radial, along-track and cross-track components.
- **Save a small correction.** A heavy tool can reverse outward drift. A light tool can shift a near miss without undoing that first pitch. **Throw power** shows the recoil for your selected tool and power. Once **Current coast** predicts a good grab, another throw can spoil it.
- **Brake along your drift.** If **Current coast** warns of fast contact, throw in the direction the suit is moving. The recoil will slow you. When you are crossing the station face, that bearing can be quite different from the bearing to the station.

## What makes a better rescue?

First, get Tommi home. Then compare **Δv brought home**. Delta-v is how much more you could change your velocity with the tools still aboard. The debrief shows the remaining budget out of the original **0.456 m/s** and the percentage you recovered. Keeping the battery leaves a different reserve from keeping the tether clip, even though each counts as one tool. A lost suit brings home zero, including when it runs out of oxygen with equipment aboard.

For the gentlest return, compare **Grab speed**, the suit’s total speed relative to the station at the instant of capture. Lower is gentler. A loss shows **Final relative speed**. Bring the original drill home and Julian awards **Upmass Hero**.

**View flight log** shows both projections of the same flight at the same scale. The V-bar/R-bar pane shows along-track and radial motion. Check the other pane for a pass above or below the station. The numbered marks match a text record of each throw’s time, tool, power, bearing, position and resulting velocity. [Example flight log](reference/orbital-flight-log.png)

## Challenge a friend

In **New flight**, choose **Random drift**. Paste a seed or replay link and press **Load seed** to preview the opening. A bare seed uses your current settings. A replay restores the sender’s flight model, capture rule and Story setting. New `D-` seeds include faster sideways crossings. Plain hexadecimal seeds replay the original, gentler family.

**Copy replay** works in setup, in the cockpit and in the debrief. The link uses Alpha’s fragment format, for example `#seed=D-00019919&level=Orbital&goal=soft&story=1`. An offline copy shares the fragment for a friend to paste into **Load seed**. A hosted copy includes the web address.

After a random flight, win or lose, open **Share → View flight card** for the seed, local finish date, V-bar/R-bar chart and abbreviated flight log. **Save image** exports a PNG. **Copy challenge** shares the result and the replay together. [Example flight card](reference/random-drift-card.png)

## Build and check

Run these commands from `fastball-3d` with Node.js. The build has no package dependencies.

```sh
node scripts/build.cjs
node tests/balance.cjs
node scripts/browser-qa.cjs
```

Open the generated `qa-runner.html` for browser results, or pass a Chromium executable path to the last command to run all four CSS viewport sizes. Additional arguments pass through to Chromium. The approved starting build is tagged `prototype-baseline`.

[Local test results and playtest questions](REVIEW.md) · [Project workflow](AGENTS.md) · [Original handoff](HANDOFF.md) · [Fastball Alpha v0.4 manual](reference/alpha-v0.4-manual.txt)

an AvaniNet game © 2026 // in honor of the legends of tgirl baseball
