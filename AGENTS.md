# KERNEL PANIC — rules for coding agents

KERNEL PANIC is a ~75-second booth game for ATÜ TechBuilders, the club's second booth game next
to BuildArena (same booth day, same Android tablet). A visitor presses a big cyber eye in a
hazard ring ("BASMAK ÜZERESİN. SONUÇLARINDAN SORUMLU DEĞİLİZ." — you are about to press, we are
not responsible for the consequences), the system "gets hacked", and they have 60 s (45/75 in
the settings) to save it in **5 stages**, each a small game with three or more steps of its own:
**Dead Pixel → Four Colours → Beam Path → Colour Trap → Don't Press** (Ölü Piksel → Dört Renk →
Işın Yolu → Renk Tuzağı → Basma Dedik on screen; stage ids `pixel`, `colours`, `beam`, `trap`,
`orders`; the last one is the final).
Every step has its own clock; a mistake or a step running out only costs that step — the stage
is always played to its end and graded by its share of right steps (green / lime / orange /
red). Surprise events (Overheat, Glitch, Power Restored) make every round different.
The end shows a **title** from the five grades, the modules in their colours and, on a separate
screen, an error report per stage. **No leaderboard, no nickname, nothing about the player is
stored.** (Until Faz 5 it was a quiz; the questions were retired in Faz 6 and archived in
`docs/archive/`.) Since Faz 7 two visitors can also play a **1v1 duel** side by side on one
split screen (§2.5).

## Since Faz 7–9 (§2.0–§2.5, §3.3)

- **The eye (Faz 9, §2.1):** the button screen's hero is `components/eye/Eye` (testids
  `btn-panic`, `btn-panic-1`/`-2`, marked `data-eye`), the cyber eye that replaced the red
  button inside the same hazard ring and warning band. `geometry.ts` holds the pure numbers
  (`LOOKS`: eight directions + `centre`, `nextLook` never repeats, `towards`, `lidPath`,
  `blinkAmount`); `motion.ts` moves it outside React: one `GazeDirector` per button screen
  (`EYE_LOOK_MS` = 3 s between looks, random blinks, `touch(x, y)` → the free eyes look there
  for `EYE_TOUCH_LOOK_MS`, `setNudge` → squint at the visitor + double blink after
  `ATTRACT_NUDGE_MS`) and an `EyeMotion` per eye that writes the SVG's transforms and lid paths
  every frame. The eye's state comes from props: `pressed` (wide open, pupil small, alarm red,
  `data-hot`), `ready` + `player` (duel: the player's colour via `--pc`, looking across at the
  other player). The buttons carry `data-look` (where they look, or `touch`) for the tests.
  `Attract` sends every pointer-down outside an eye to `director.touch()`.

- **Opening (APK only, or `?intro=1`):** Android's launch screen (`res/drawable/splash_power.xml`:
  red power symbol, cyan ring) stays up until `fx/BootIntro` marks `<html data-boot="ready">`
  (`MainActivity`, 8 s max); BootIntro then plays logo → "ATÜ TECHBUILDERS SUNAR" → KERNEL PANIC
  → five modules → folds into a line onto the button screen. A tap skips it. The logo's chip
  powers on there (`LogoChip boot`: ring, traces drawing out left, right and up).
- **Button screen:** big logo in its chip (`components/LogoChip`: the club banner's glowing ring
  and circuit traces, drawn around the untouched artwork; `TopBar`'s `.brand` clips the traces
  at the stage's top and left edges, because a screen switch lifts the header out of the stage)
  and the club's name in Orbitron
  (`--font-brand`; ATÜ white, TECH cyan, BUILDERS `--cobalt-text`) (`brand`); 5 taps on the logo is
  the sudo easter egg (nothing else hides there); a small gear (`btn-settings`) opens the
  settings, which hold only the round length and sound; "Bizi takip edin" (`btn-social`) opens
  the club's Linktree QR (`public/social/linktree-qr.png`, `components/SocialDialog`).
- **Mode switch** `mode-solo` / `mode-duel`. In duel mode the button screen shows two smaller
  eyes (`btn-panic-1`, `btn-panic-2`) looking together; the round starts only when both have
  pressed (a lone press resets after `DUEL_READY_WAIT_MS`).
- **Duel** (`screens/DuelPlay`, `screens/DuelResult`, rules in `game/duel.ts`): two `useGame()`
  instances share one `RoundSetup` (same seed, same plan, same events), each started as its own
  `player` (1, 2; solo is 0). Same difficulty, other answers (`game/stages/players.ts`: the dead
  pixel elsewhere, other colour orders, other words, another command order; Beam Path the same
  for both); player 1 keeps the solo content. The duel gets the same Glitch as a solo round.
  Each half is `<Play layout="half">` (`half-1`, `half-2`; the half layout lives in
  `[data-layout='half']` overrides in every stage's CSS). A finished half plays its own result
  transition (`ResultTransition layout="half"`: the 1280×800 scene with CSS `zoom` so the blend
  layers still blend; preview `?transition=<title>&half=1`), then waits (`duel-waiting`); the
  duel result comes once both endings have played. The winner has more `duelPoints`, then more
  time left. Player colours `--p1` (blue) and `--p2` (orange). The duel's home button sits on
  the seam under VS. The right half mirrors the left: its stage card (`stage-card`) has its
  accent border on the outer (right) edge (`[data-side='2']` in `Play.module.css`).
- **Home button** (`btn-home`, `components/HomeButton`): hold 1 s during a round to return to
  the button screen (a hold, so a stray tap never ends someone's round).
- **Emergency is gone (Faz 10, §3.3):** no safe/risky versions of a stage any more (no
  `Variant`); `planEvents` gives every round exactly one Glitch on stage 2, 3 or 4.
- **Variety (Faz 10):** Dead Pixel paints its five screens from `PIXEL_COLOURS` (eighteen
  colours, lightness tuned per hue, nudged every round; neighbours ≥ 40° apart). Keep the plain
  squares: the club rejected other pixel shapes. Beam Path
  lines come from `BEAM.lines` (three recipes per line) and `mirrorLine()` (left ↔ right, top ↔
  bottom; `BeamLine.source` is the emitter, `sourceDir()` its direction).
- **Dead Pixel** has five screens (`PIXEL.levels`: two easy, two medium, one close look).
- **Overheat:** the cooling is "don't touch the screen for 3 s". Fast mode (plenty of time):
  touching costs −5 s ("SİSTEM ISINDI"), holding off gives nothing. Slow mode (time short):
  holding off gives +5 s, touching costs nothing (`coolingShiftMs` in `game/events.ts`).

**No API, no network.** Everything is local and offline (PWA, later an APK via Capacitor).

## Spec

`docs/ROADMAP.md` (PDF next to it) is the single source of truth: flow per screen (§2), the
five stages (§2.3), events (§3), timing (§4), grades, titles and transitions (§5), error report
(§6), sound (§7), tech plan (§8), palette (§9), the day-by-day roadmap (§10) and the decision
log (§11). It quotes the game's Turkish on-screen texts with translations. The club's original
sketches are `docs/sketches/1-4.png`; the stage designs the club approved are the "Kernel Panic
Beş Aşama" page, the eye the "Kernel Panic Göz" page (the cyber eye). Read the relevant section
before every task. Decisions in §11 are final; don't reopen them.

Every tunable number lives in `src/game/config.ts` (round length, step limits, grade
thresholds, event odds, bonuses). Change balance there, never inside a screen.

**Stages.** Each stage has a pure generator in `src/game/stages/` (seeded: the same round seed
gives the same screens; `stages.test.ts` checks e.g. that every beam line is solvable) and a
runner in `src/screens/stages/runners/`: a small class that owns the stage's timers, publishes
an immutable view and talks to the round through `StageIO` — `hold(on)` (the player only
watches: the round clock stands still), `score(ok, miss, note?)` (steps; the note goes into the
error report), `done()`. The React component only draws the view and forwards taps
(`useRunner`). Keep logic out of components: oxlint's React rules (refs, immutability, purity)
must stay at zero warnings. The round's reducer (`src/game/engine.ts`) never sees a game's
details, only steps, holds and the end of a stage.

The booth day is **4 November 2026**; the phase plan is `docs/ROADMAP.md` §10 and the
`kernelpanic-phase` skill.

## Stack (installed — don't add libraries without a reason)

| Concern     | Choice                                                                           |
| ----------- | -------------------------------------------------------------------------------- |
| App         | React 19 + TypeScript 6 + Vite 8, path alias `@/` → `src/`                       |
| Styling     | CSS Modules on the tokens in `src/styles/tokens.css`                             |
| State       | `useReducer` state machine `attract → hack → play → result → report` (×2: duel)  |
| Animation   | CSS keyframes + transitions on the motion tokens, `<canvas>` (code rain, embers) |
| Audio       | Web Audio synthesis only: effects (`sfx.ts`) + generative music (`music.ts`)     |
| PWA         | vite-plugin-pwa (offline, fullscreen, landscape)                                 |
| Android APK | Capacitor (same pipeline as BuildArena: `../BuildArena/scripts/build-apk.mjs`)   |
| Fonts       | @fontsource Chakra Petch (UI) + JetBrains Mono (terminal) + Orbitron (club name) |
| Tests       | Vitest + React Testing Library + jsdom; Playwright (1280×800 touch tablet)       |
| Lint/format | oxlint (`.oxlintrc.json`) + Prettier                                             |

TypeScript stays on 6.x: TS 7 has no `tsserver.js`, which breaks the editor (Antigravity).

## Commands

```bash
npm run dev          # http://localhost:5174  (BuildArena uses 5173)
npm run dev:tablet   # same, reachable from the tablet on the local network
npm test             # unit + component tests (Vitest)
npm run e2e          # Playwright: tablet 1280×800 touch + PWA offline project (ports 5174/4174)
npm run lint         # oxlint
npm run typecheck    # tsc -b
npm run build        # production build + service worker
npm run check        # all of the above, in CI order — must be green before work is done
npm run apk          # Android APK (Capacitor, android/) → dist-apk/ (copy it to the Desktop)
```

## Folder structure

```
src/
  app/         storage, test flags, timing (dur/sleep), press guards
  components/  Stage (fixed 1280×800, scaled), shared controls, eye/ (the button screen's eye)
  game/        types, config, pure rules (reducer, grades, titles, events) — unit-tested
  game/stages/ the five stages' generators (pixel, colours, beam, trap, orders) + players.ts
  screens/     Attract, Hack, Play, Result, Report, Settings, DuelPlay, DuelResult
  screens/play/    stage host + title card, grade card, event panels (Overheat, Cooling)
  screens/stages/  the five stage games (PixelStage … OrdersStage) + runners/ (timed logic)
  fx/          code rain, glitch, scanlines, transitions, the APK's opening (BootIntro)
  audio/       synthesised sounds
  data/        disclaimers, stage texts, title texts
  styles/      tokens.css
tests/unit/    pure logic        tests/component/  RTL screen tests        e2e/  Playwright
```

## Testing is not optional

The user's standing requirement (from BuildArena): **every button and every page is tested
while developing.** Follow `.agents/skills/kernelpanic-button-tests/SKILL.md`.

- Game rules (grades, titles, event triggers, the stage generators) are pure functions with unit
  tests; the stage runners are tested with fake timers (`tests/unit/runners.test.ts`); timed
  behaviour in the browser uses `page.clock`.
- E2E tests must not depend on the machine's speed (CI runs on slow 2-core runners): never race
  a step clock from outside. Hold the page's clock (`holdClock(page)` after
  `page.clock.install()`, then `page.clock.runFor()`), or act inside the page in one
  `evaluate` (several taps, a `MutationObserver` noting short states), or wait on a lasting
  state. Check timing-heavy specs with a slow CPU (`Emulation.setCPUThrottlingRate`, rate 4,
  2 workers).
- After any UI change, run the dev server and click through the touched screens at 1280×800.
- Never delete, skip or loosen a failing test to get green. Fix the code, or explain and ask.

## Code conventions

- UI text is **Turkish**; everything else is English: identifiers, string ids (stage ids,
  commands such as `press`/`dontPress`/`hold`/`triple`/`green`, phases), test ids, file names,
  comments, test names and documents (the repository is public). Big system banners stay English
  on purpose (SYSTEM FAILURE, SYSTEM OVERHEAT!, title names). The stages keep their Turkish names
  on screen and in comments as proper names (Ölü Piksel …).
- Every screen root and interactive element has a kebab-case `data-testid`: screens `attract`,
  `hack`, `play`, `result`, `report`, `settings`; stages `stage-pixel`, `stage-colours`,
  `stage-beam`, `stage-trap`, `stage-orders` (inside the host `stage`, with `data-stage` and
  `data-live`; the card around them is `stage-card`); buttons `btn-*` (`btn-panic` = the eye,
  `btn-press` = the final's red button, `btn-report`, `btn-restart`, `btn-settings`,
  `btn-social`, `btn-home`, `btn-panic-1`/`-2`); duel `mode-duel`, `half-1`/`half-2`,
  `half-tag`, `duel-waiting`,
  `duel-result`; Dead Pixel `pixel-grid`; opening
  `boot-intro`. Test builds also mark the right move on each
  stage (`data-odd`, `data-seq`, `data-need`, `data-correct`, `data-eff`) for the e2e helper.
- Tappable controls: ≥ 64 px, pressed feedback, `usePressGuard` (double-tap guard) on anything
  that navigates or restarts; inside a stage the runner ignores taps outside a live step.
- localStorage only through `src/app/storage.ts`. Test-only URL flags only through
  `getTestFlags()`: `?seed=N`, `?fastTimers=1` (animation waits only — never the round clock or
  the step limits), `?event=glitch|power|overheat-fast|overheat-slow|none` (`none`: a
  round without surprises), `?transition=<title>&mood=<mood>` (loops one result transition;
  `&half=1` inside a duel half),
  `?intro=1` (plays the APK's opening in the browser), `?perf=low` (the light mode of a slow
  device).
- Scripted waits use `dur()` + `sleep(ms, signal)`; sequences are cancelled on unmount.

## Motion (the club's feedback — keep it)

- Soft and connected: every effect grows out of an element on screen. No detached particle
  bursts, screen shakes or screen tears (they were removed on purpose in Faz 4).
- Use the tokens in `tokens.css`: `--ease-soft`, `--ease-in-out`, `--dur-s/m/l`.
- One world under every screen: `fx/World.tsx` (code rain, perspective grid floor, the room's
  light per mood, CRT glass) never unmounts, so the room changes mood instead of cutting —
  cyan at the button, red when hacked, the event's colour, the result's colour. Screens are
  see-through on it. A new light comes up before the old one lets go (no dark dips).
- Screens cross-fade with `app/screenSwitch.ts` (View Transitions: the old screen dissolves as
  a picture, the new one rises live, the world stays live underneath). Route every screen change
  through `go.*` in `App.tsx`. The shared header (`components/TopBar`, button ↔ hack) holds
  still across the switch; only its status light changes. A View Transition draws its snapshots
  above the whole page, outside the stage's clip: whatever overflows a named element (`screen`,
  `topbar`) must be clipped inside that element (see the chip in `TopBar.module.css`).
- The stage card stays mounted for the whole round; the stages change inside it. A stage's game
  is already there, dimmed, under its title card and comes up to full light when the card lets
  go; when it ends it steps back under its grade card (a meter filling along the colour scale),
  and its module in the HUD takes the grade's colour. Event panels take the card's place while
  it fades out. Within a game, things that change place glide (pads, colour buttons, mirrors)
  and a new screen settles in; nothing jumps.
- The result transition is never a separate scene: `App.tsx <Ending>` is one container for the
  round and its end, so the stage screen is never remounted; it stays (inert) underneath while
  `fx/ResultTransition` dims, freezes or switches it off and a small piece of the system tells
  the story on top (restore ring, rack lights, inspector lens from the broken module via
  `--bug-x/--bug-y`, boot window, boot menu, 404 window, the kernel's last words, LEGEND that
  does not fill, the power button). BARELY BOOTED's boot window is the model the club liked.
  At the reveal the stage screen recedes first, the layers dissolve after it (Web Animations,
  `dissolve()`, words first via `data-words`), and the five HUD cells fly into the result's big
  cells (FLIP, `Result.tsx`). Never put `z-index`, `opacity` or `filter` on the transition
  root: that isolates the blend layers into flat colour panels.
- **Performance (Faz 11, the booth tablet stuttered while a PC was fine):** on big or
  long-running layers animate only `transform` and `opacity` (never `background-position`, a
  gradient's angle or another custom property: they repaint the layer every frame); canvases
  are drawn at the stage's 1280 × 800, not the device pixel ratio; SVG that moves is written
  only when a value changes (`EyeMotion.set`); anything that updates often (a typewriter, the
  round clock) lives in its own small component or above a `memo` (`StageHost`). A slow device
  gets `<html data-perf="low">` from `app/perf.ts` (median frame > 25 ms in the first seconds;
  `?perf=low` in tests): the floor stops, the rain halves its frame rate, the title glitch
  rests. Measure with a 4× slower CPU, `deviceScaleFactor: 2` and a trace (Paint, RasterTask,
  Commit) before and after.
- A CSS transition never starts on a property an animation holds — the element just cuts. So:
  entry animations with from-only keyframes fill `backwards`, not `both`; a looping opacity
  animation (breathing light) lives on an inner `::before`; to fade a layer that has its own
  animation, use `element.animate()` (it composes over the CSS animation).
- Music: `setMusic()` per screen — a catchy theme on the button ("Sinyal"), silence under the
  hack alarm, the tense countdown theme on the stages (Play sets intensity: the final stage /
  last 10 s up, Overheat muffled), a theme per result tone (`toneOf`: win / close / crash).
  Separate "Müzik" switch in the settings (gear); e2e: `e2e/music.spec.ts` reads
  `window.__kpMusic`. In the duel the halves play no music of their own; `DuelPlay` sets it
  from both rounds.

## Design

- Palette from the club logo (`tokens.css`, mirrored in `src/game/palette.ts`): night
  `--night #090E1D`, cyan `--cyan #44EFEC`, cobalt `--cobalt #0040E0` (fills only, not text on
  night), code green `--code-green #02FF18`, white. Alarm red `--alarm #FF2D4A` and amber
  `--warn #FFB020` are deliberate additions for the drama. The stage grades have their own
  scale: `--grade-perfect` (green), `--grade-good` (lime #B8F53D), `--grade-pass` (orange
  #FF8C1A), `--grade-fail` (red). The duel's players: `--p1` (blue #5B8CFF) and `--p2` (orange
  #FF9A52). Colours only through tokens.
- Chakra Petch for UI and commands (stage text ≥ 28 px), JetBrains Mono for terminal logs,
  timers and codes, Orbitron (`--font-brand`) only for the club's name.
- The eye must read as "press me" from across the booth: big, in the hazard ring with the
  warning band, sonar rings, a breathing glow; it looks around every 3 s and at every touch.
- The logo artwork (`public/logo/techbuilders_logo.png`, master in `store/logo/`) is never
  recoloured, redrawn or edited; its chip frame (`LogoChip`) is drawn around it.
- **Photosensitive safety:** nothing flashes more than 3 times per second; the device's
  `prefers-reduced-motion` tones shakes and flashes down (the "Efekt azalt" switch left the
  settings in Faz 7: the settings hold only time and sound).
- Sound is ON at the booth: sharp, clear alarm/event cues, quiet background; every audio cue
  also has a visual one (the booth is noisy).
- Kiosk: landscape 1280×800, no scrolling, zoom, text selection or long-press menus; idle
  result/report screens return to the button after 25 s.

## Definition of done

1. Matches `docs/ROADMAP.md` (or a decision in its §11).
2. Tests exist for its buttons and rules; `npm run check` is green.
3. The touched screens were clicked through in the browser at 1280×800.
4. The report lists what was tested automatically and what still needs the real tablet (sound
   level, touch feel, brightness, performance of the effects).

Don't commit or push unless the user asks.
