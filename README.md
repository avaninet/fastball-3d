# Fastball 3D v0.4

You have ten minutes of oxygen, nine tools and one job. Get Capt. Tommi Dylan back within reach of the station’s grab bars.

[Play Fastball 3D v0.4 in your browser](https://avaninet.github.io/fastball-3d/) · [Download the standalone v0.4 game](https://raw.githubusercontent.com/avaninet/fastball-3d/v0.4/index.html)

**New in v0.4.** Dodgeball Challenge puts a loose service cover and a bent frame across your route home. Random Dodgeball offers eight debris layouts with 512 replayable variations each. High-speed Orbital approaches now register at the grab bars, and First rescue can guide you home after a wrong-way opening pitch.

Fastball 3D is a very generous and forgiving approximation of a space emergency scenario that has fortunately never occurred. **Do not try this on orbit.**

**To play offline**, download `index.html` and open it in your browser. The game, cameras and artwork are all in that file. The cockpit targets Chromium 108+, Safari 16+ and Firefox 121+ for dynamic viewport units, container units and the CSS `:has()` selector. [Game file](index.html)

**The tool goes through the forward crosshair. You recoil the other way.** On **Tether separation**, face away from the station before you throw. The tool will leave the forward visor and you can watch for the station in the aft camera. In the flight instruments, **Current coast** tells you whether you’ll reach the bars. If it says “Aim up and right,” that’s where to throw the *tool*. The recoil nudges your suit down and left relative to the same view.

## The service call

Private space contractor BOREX designed its first spacesuit for the people who would maintain fleets of commercial datacenter satellites. The lightweight suit gave a technician more freedom to maneuver, and its automatic return system was supposed to bring them home if they came loose. On the first outing, mission specialist Capt. Tommi Dylan (she/they) is making the orbital equivalent of a service call to cold-reboot an inference server. Yes, it takes all nine tools.

The tether parts. The thruster valves stick closed. An astronaut drifting away without a tether or working emergency thrusters is presumed lost. Station commander Julian Bern can still see her radar track. Tommi can still put a hand on the wrench pouch. Newton’s third law gives her one last option. Fling a wrench as hard as she can out into space and the wrench pushes her back.

It’s the night of the new moon. From here in Earth’s shadow, the planet hides both Sun and Moon. A few stars hang above the dark curve of Earth. Ten minutes of air. The station a little farther away with every second. Tommi looks down the throat of death and decides she’s going to pitch her way home.

Tommi is widely rumored to have been the test pilot of the classified “unmanned” X-99 orbital spaceplane. “Let’s just say she’s set records she can never brag about.” —&nbsp;Commander&nbsp;Julian&nbsp;Bern

The habit that comes back to her now is older than that. She was a high-school star pitcher. She still plays Saturdays with her friends, sometimes against a team from the next town. She fits her fingers around the handle as if it had seams, loosens them, then takes her grip again. On a dusty field in the bright sun, that’s the moment the crowd goes quiet for her. Out here the silence gives her a little room to breathe. She’ll need it.

The crew would like their drill back. It’s the only one aboard until resupply, and by now it’s practically Tommi’s pet. After the incident, NASA has a talk with BOREX about where to put its datacenters. Earth comes strongly recommended.

## Fly a first rescue

1. For a manual flight, leave **Tether separation**, **Straight-Line** and the default any-speed grab selected. **Begin flight** starts the clock and unlocks aiming. For a guided pitch with time to line up, choose **First rescue** in the header instead.
2. Turn the forward visor, choose a tool from the rack, set the power and press **Throw**. Turning your head only changes where the next tool will go. Your existing drift carries on.
3. Read **Current coast** after each throw. **Contact in** means your present path reaches the bars. You can keep the tools you have left and advance the clock. **Miss by** gives the clearance at the nearest pass and a direction for a correction. Try a light tool while the pass is still ahead.
4. Reach any part of the outlined **14 × 3.2 × 14 m** volume (X × Y × Z, with the thin side along track), including the gaps between panels. The grab happens automatically. You have **10:00** in every mode. In manual flight, after your last throw a miss or an unavoidable overspeed ends the flight at release. If a debris collision is forecast, the clock runs to impact. Both visors fade to **GAME OVER**, then the debrief explains why. In Orbital, even a fast entry can still lead to a soft grab if you slow enough inside the bars. Let that coast play out.

## Choose the challenge

Use **New flight** to combine an opening, a flight model and a capture rule. **Story flight** adds assistance independently.

| Setting | What changes |
| --- | --- |
| Tether separation | A slow outward drift. A good place to learn which camera to watch after a throw. |
| Lateral drift | You’re sliding across the station face. Watch where you’ll pass even as the range shrinks. |
| Wide separation | You start farther out. An early throw buys time to spot and correct a miss. |
| Dodgeball Challenge | A failed work platform tears away Tommi’s tether anchor. A loose service cover and a bent equipment frame cross the return route. Both pieces follow the chosen flight model. |
| Random drift | A seed fixes the starting position and velocity. Friends can fly the same opening. |
| Random Dodgeball | A DB2 seed selects one of 4,096 qualified openings. Four layouts send the cover across the initial approach first, and four send the frame first. Use either flight model, any grab rule, and either inventory mode. |
| Straight-Line / Orbital | In Straight-Line, velocity stays constant between throws. In Orbital, the path can bend relative to the orbiting station. Watch the committed coast. |
| Grab rule | Any-speed is the default. Soft allows **0.080 m/s** or slower. The optional Firm playtest allows **0.120 m/s** or slower. Both limits apply anywhere within the bars. You can brake inside the volume or come back around. |
| Story flight | Unlimited auto-reloading tools with **Face station**, **Face away** and **Face drift**. Drift scenarios start closer to the bars. Both Dodgeball modes keep the same starting geometry in Story and manual flight. Line up before the clock starts or while paused. **Throw** starts or resumes flight at 1×. |

**Manual approach.** Face drift aligns the visor for a braking pitch while the clock runs. A mint edge arrow points toward drift when it leaves the forward view. On a fast approach, the clock returns to 1x in the final 30 seconds so you can brake. Check the changed coast after each throw.

**Flying around debris.** The amber box marks the piece on your collision course. The blue cross shows where your suit would hit it. Switch on **Preview throw** to see whether a pitch clears the box. **Dodgeball Coach** suggests a tool and bearing during a warning, and fast-forward drops to 1× with up to 65 seconds to react. [How the Random Dodgeball openings were tested](reference/random-dodgeball-study.md)

**First rescue** is the optional walkthrough with exact pitches. It stages a first throw, pauses for a halfway course check, then offers an oblique miss, a braking lesson and an Orbital comparison. Only **First rescue** pauses automatically for a course check. In later lessons you can choose when to stage a correction. If the first battery goes toward the station, **Line up correction** stages a full-power battery to counter the outward drift. Throw it, then line up the return pitch. **Skip guidance** gives you manual control with the nine tools currently aboard. Each can then be thrown once. A flight that starts in the lesson is scored as assisted even if you skip before the first throw. Compare throw count and speed on that flight. **Retry** after skipping starts the standard manual opening with a full rack and a fresh clock. Replay the lesson anytime from **Guide**.

## Cockpit controls

| Action | Mouse, touch or keyboard |
| --- | --- |
| Look / aim | Drag the forward visor or tap a point to center it. Arrow keys turn 2°. Heading increases when you turn left. Hold **Shift** for 0.25° steps. Use the **STN** cue to find the station when it’s off-screen. |
| Select equipment | Click or tap the rack, or press **1–9** on the number row or numpad in ascending weight order. Manual flight selects the lightest remaining tool after a release. Story keeps the reloaded tool selected. |
| Set power and release | Drag **Throw power**, or use the two key positions immediately to the right of **P** (US **[** and **]**). Numpad **−** and **+** also change power in one-point steps. Press **Throw**, or **Enter** with the forward visor, either slider or a cockpit checkbox focused. A focused slider keeps its arrow keys. In Story, every tool reloads immediately. Suit and gear mass stays constant, so a repeat throw at the same power gives the same recoil. |
| Preview the next throw | Tick **Preview throw** under **Current coast** in either flight model. The solid violet path shows where the suit would coast with this aim, tool and power. The dashed mint path shows where it’s already going. Turn the preview off at any time. |
| Pause / resume | Use the clock button or **P**. In manual flight you can read instruments while paused and resume to aim. Opening **Guide** or **New flight** pauses a running flight. Close the dialog and press **Resume** when ready. |
| Speed up a coast | Drag **Play speed** to **1×**, **10×**, **20×** or **30×**. Every throw resets it to 1×. A clock interruption longer than one real second pauses the simulation. |

## Read the approach

- **Look for the miss early.** The mint marks in both cameras trace your committed coast. The brighter, thicker dashes are closer to your suit. Arrowheads get smaller with distance. Looking straight down a Straight-Line coast, you see a ring with the distance to contact or to your predicted position at oxygen expiry. Read the time and distance in **Current coast** to tell a future pass from one already behind you. Its aiming hint follows the forward visor as you turn.
- **Check speed as well as distance.** A negative **Range rate** means the gap to the nearest bars is shrinking. You can still slide past them sideways. **Relative speed** includes motion in all three directions. The gauge marks the soft-capture threshold, and the velocity panel below breaks the motion into radial, along-track and cross-track components.
- **Save a small correction.** A heavy tool can reverse outward drift. A light tool can shift a near miss without undoing that first pitch. **Throw power** shows the recoil for your selected tool and power. Once **Current coast** predicts a good grab, another throw can spoil it.
- **Brake along your drift.** If **Current coast** warns of a fast entry, throw in the direction the suit is moving. The recoil will slow you. When you are crossing the station face, that bearing can be quite different from the bearing to the station.

## What makes a better rescue?

First, get Tommi home. In Story, compare throw count or grab speed. In manual flight, compare **Δv brought home**. Delta-v is how much more you could change your velocity with the tools still aboard. The debrief shows the remaining budget out of the original **0.456 m/s** and the percentage you recovered. Keeping the battery leaves a different reserve from keeping the tether clip, even though each counts as one tool. A lost suit brings home zero, including when it runs out of oxygen with equipment aboard.

For the gentlest return, compare **Grab speed**, the suit’s total speed relative to the station at the instant of capture. Lower is gentler. A loss shows **Final relative speed**.

Tommi and Julian have twelve rescue calls between them, one for each opening and flight model. Bring the original drill home and Julian adds **Upmass Hero** after the call. A Story reload supplies a replacement drill. Choosing **Skip guidance** during a lesson makes that flight ineligible for the award.

<details>
<summary>Read the Upmass Hero epilogue</summary>

### Upmass Hero

“Supply, cross that replacement drill off the manifest. Think you could send us some board games instead?”

_Back on Earth, the drill gets a ticker-tape parade. Tommi has a game that Saturday._

</details>

**View flight log** shows both projections of the same flight at the same scale. The V-bar/R-bar pane shows along-track and radial motion. Check the other pane for a pass above or below the station. Each release has a mark on the chart and a numbered entry with its time, tool, power, bearing, position and resulting velocity. On long flights the chart labels a selection of throws. [Example flight log](reference/orbital-flight-log.png)

## Challenge a friend

In **New flight**, choose **Random drift** or **Random Dodgeball**. **Generate seed** draws from the selected scenario. Pasting a code or replay link selects the matching scenario automatically. A bare seed uses your current settings. A replay restores the sender's flight model, grab rule, Story setting and starting Preview and Dodgeball Coach settings. The debrief, flight log and card record which optional aids were enabled during the flight, including manual Face drift when used. You can change those settings after loading the link. Dodgeball codes such as `DB2-00500007` restore both debris trajectories. Earlier DB1 codes still replay their original openings. The [catalog study](reference/random-dodgeball-study.md) gives one playable code for each layout. New `E-` seeds include sideways crossings and require at least one throw to reach the bars within ten minutes in either flight model, in manual and Story flight. Existing `D-` and plain hexadecimal seeds replay their original openings.

**Copy replay** works in setup, in the cockpit and in the debrief. The link uses Alpha’s fragment format, for example `#seed=E-00019919&level=Orbital&goal=soft&story=1`. An offline copy shares the fragment for a friend to paste into **Load seed**. A hosted copy includes the web address.

After a random flight, win or lose, open **Share → View flight card** for the seed, local finish date, V-bar/R-bar chart and abbreviated flight log. The card lists throws 1–5 down the left and 6–9 down the right. Longer flights get a tenth line reading “...and then some” and the chart traces the entire approach. **Save image** exports a PNG. **Copy challenge** shares the result and the replay together. [Example flight card](reference/random-drift-card.png)

## Build and check

Run these commands from `fastball-3d` with Node.js 18 or newer. The game and build have no package dependencies.

The build takes the guide’s version from `package.json` and stamps the credits with the UTC date whenever the standalone game changes. Rebuilding the same game preserves its date.

```sh
node scripts/build.cjs
node scripts/build.cjs --check
node tests/station.cjs
node tests/balance.cjs
node tests/dodgeball.cjs
node tests/difficulty.cjs
node scripts/browser-qa.cjs
```

Open the generated `qa-runner.html` for browser results, or pass a Chromium executable path to the last command to run all four CSS viewport sizes. Each run reports all four results. The short-window tests resize the cockpit again for laptop windows down to 1280 × 600 and phone viewports down to 375 × 553 and 320 × 568. On the shortest phones the rack spans the screen, the instrument panel scrolls, and the scenario summary follows the cockpit.

By default the checks use installed system fonts plus an Arial/Courier fallback. CI sets `FASTBALL_QA_FONT_DIR` to the directory containing DejaVu Sans and DejaVu Sans Mono (regular and bold). The runner embeds those four font files in its test page. To reproduce the CI font metrics on Debian or Ubuntu with `fonts-dejavu-core` installed, run `FASTBALL_QA_FONT_DIR=/usr/share/fonts/truetype/dejavu node scripts/browser-qa.cjs google-chrome`.

Use a trusted local browser executable and flags. The balance harness also accepts an older HTML build for comparison and executes its embedded physics, so use builds you trust. `npm test` verifies the distributable, the station joints, flight balance and Dodgeball routes. For the native Space-key, clipboard and PNG checks, start a matching ChromeDriver on port 9515 and run `npm run test:native` with Node 18 or newer. For standalone hosting, configure the HTTP response header `Content-Security-Policy: frame-ancestors 'none'` at the host. The offline page embeds hashes for its scripts and stylesheet. The approved starting build is tagged `prototype-baseline`.

[Local test results and playtest questions](REVIEW.md) · [Difficulty study](DIFFICULTY.md) · [Project workflow](AGENTS.md) · [Historical prototype handoff](HANDOFF.md) · [Fastball Alpha v0.4 manual](reference/alpha-v0.4-manual.txt)

an AvaniNet game © 2026 // dedicated to the legends of tgirl baseball everywhere

[avani@avaninet.com](mailto:avani@avaninet.com)

[Capture-speed playtest results](reference/capture-speed-playtest.md) · [License and permissions](LICENSE)
