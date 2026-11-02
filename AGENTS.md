# KERNEL PANIC — rules for coding agents

KERNEL PANIC is a ~75-second booth game for ATÜ TechBuilders, the club's second booth game next
to BuildArena (same booth day, same Android tablet). A visitor presses a big red button
("BASMAK ÜZERESİN. SONUÇLARINDAN SORUMLU DEĞİLİZ."), the system "gets hacked", and they have
60 s (45/75 in the settings) to save it in **5 stages**, each a small game with three or more
steps of its own: **Ölü Piksel → Dört Renk → Işın Yolu → Renk Tuzağı → Basma Dedik** (the final).
Every step has its own clock; a mistake or a step running out only costs that step — the stage
is always played to its end and graded by its share of right steps (green / lime / orange /
red). Surprise events (Overheat, Glitch, Emergency, Power Restored) make every round different.
The end shows a **title** from the five grades, the modules in their colours and, on a separate
screen, an error report per stage. **No leaderboard, no nickname, nothing about the player is
stored.** (Until Faz 5 it was a quiz; the questions were retired in Faz 6 and archived in
`docs/arsiv/`.) Since Faz 7 two visitors can also play a **1v1 düello** side by side on one
split screen (§2.5).

## Since Faz 7–8 (§2.0–§2.5, §3.3)

- **Opening (APK only, or `?intro=1`):** Android's launch screen (`res/drawable/splash_power.xml`:
  red power symbol, cyan ring) stays up until `fx/BootIntro` marks `<html data-boot="ready">`
  (`MainActivity`, 8 s max); BootIntro then plays logo → "ATÜ TECHBUILDERS SUNAR" → KERNEL PANIC
  → five modules → folds into a line onto the button screen. A tap skips it. The logo's chip
  powers on there (`LogoChip boot`: ring, traces drawing out left, right and up).
- **Button screen:** big logo in its chip (`components/LogoChip`: the club banner's glowing ring
  and circuit traces, drawn around the untouched artwork) and the club's name in Orbitron
  (`--font-brand`; ATÜ white, TECH cyan, BUILDERS `--cobalt-text`) (`brand`); 5 taps on the logo is
  the sudo easter egg (nothing else hides there); a small gear (`btn-settings`) opens the
  settings, which hold only the round length and sound; "Bizi takip edin" (`btn-social`) opens
  the club's Linktree QR (`public/social/linktree-qr.png`, `components/SocialDialog`).
- **Mode switch** `mode-solo` / `mode-duel`. In duel mode the button screen shows two smaller
  buttons (`btn-panic-1`, `btn-panic-2`); the round starts only when both have pressed (a lone
  press resets after `DUEL_READY_WAIT_MS`).
- **Duel** (`screens/DuelPlay`, `screens/DuelResult`, rules in `game/duel.ts`): two `useGame()`
  instances share one `RoundSetup` (same seed, same plan, same events), each started as its own
  `player` (1, 2; solo is 0). Same difficulty, other answers (`game/stages/players.ts`: the dead
  pixel elsewhere, other colour orders, other words, another command order; Işın Yolu the same
  for both); player 1 keeps the solo content. No Emergency in a duel (`planEvents(…, duel)`).
  Each half is `<Play layout="half">` (`half-1`, `half-2`; the half layout lives in
  `[data-layout='half']` overrides in every stage's CSS). A finished half plays its own result
  transition (`ResultTransition layout="half"`: the 1280×800 scene with CSS `zoom` so the blend
  layers still blend; preview `?transition=<title>&half=1`), then waits (`duel-waiting`); the
  duel result comes once both endings have played. The winner has more `duelPoints`, then more
  time left. Player colours `--p1` (blue) and `--p2` (orange). The duel's home button sits on
  the seam under VS.
- **Home button** (`btn-home`, `components/HomeButton`): hold 1 s during a round to return to
  the button screen (a hold, so a stray tap never ends someone's round).
- **Emergency (solo only):** the screen freezes (clock stands still, the World's code rain slows
  to a stop, "SÜRE DURDU"); `EMERGENCY_READ_MS` to read without a countdown, then
  `EMERGENCY_CHOOSE_MS` before the safe channel is picked.
- **Ölü Piksel** has five screens (`PIKSEL.levels`: two easy, two medium, one close look).
- **Overheat:** the cooling is "don't touch the screen for 3 s". Fast mode (plenty of time):
  touching costs −5 s ("SİSTEM ISINDI"), holding off gives nothing. Slow mode (time short):
  holding off gives +5 s, touching costs nothing (`coolingShiftMs` in `game/events.ts`).

**No API, no network.** Everything is local and offline (PWA, later an APK via Capacitor).

## Spec

`docs/YOL-HARITASI.md` (Turkish; PDF next to it) is the single source of truth: flow per screen
(§2), the five stages (§2.3), events (§3), timing (§4), grades, titles and transitions (§5),
error report (§6), sound (§7), tech plan (§8), palette (§9), the day-by-day roadmap (§10) and
the decision log (§11). The club's original sketches are `docs/taslak/1-4.png`; the stage
designs the club approved are the "Kernel Panic Beş Aşama" page. Read the relevant section
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

The booth day is **4 November 2026**; the phase plan is `docs/YOL-HARITASI.md` §10 and the
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
| Fonts       | @fontsource Chakra Petch (UI) + JetBrains Mono (terminal), latin + latin-ext     |
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
  components/  Stage (fixed 1280×800, scaled) and shared controls
  game/        types, config, pure rules (reducer, grades, titles, events) — unit-tested
  game/stages/ the five stages' pure generators (pixel screens, colour layers, beam lines, …)
  screens/     Attract, Hack, Play, Result, Report, Settings, DuelPlay, DuelResult
  screens/play/    stage host + title card, grade card, event panels (Emergency, Overheat, Cooling)
  screens/stages/  the five stage games: components + runners/ (their timed logic)
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
- After any UI change, run the dev server and click through the touched screens at 1280×800.
- Never delete, skip or loosen a failing test to get green. Fix the code, or explain and ask.

## Code conventions

- UI text is **Turkish**; code, comments and identifiers are English. Big system banners stay
  English on purpose (SYSTEM FAILURE, SYSTEM OVERHEAT!, title names).
- Every screen root and interactive element has a kebab-case `data-testid`: screens `attract`,
  `hack`, `play`, `result`, `report`, `settings`; stages `stage-piksel` … `stage-basma` (inside
  the host `stage`, with `data-stage` and `data-live`); buttons `btn-*` (`btn-panic`,
  `btn-basma`, `btn-report`, `btn-restart`, `btn-settings`, `btn-social`, `btn-home`,
  `btn-panic-1`/`-2`); duel `mode-duel`, `half-1`/`half-2`, `half-tag`, `duel-waiting`,
  `duel-result`; Emergency `emergency-frozen`, `emergency-hint`, `emergency-limit`; opening
  `boot-intro`. Test builds also mark the right move on each
  stage (`data-odd`, `data-seq`, `data-need`, `data-correct`, `data-eff`) for the e2e helper.
- Tappable controls: ≥ 64 px, pressed feedback, `usePressGuard` (double-tap guard) on anything
  that navigates or restarts; inside a stage the runner ignores taps outside a live step.
- localStorage only through `src/app/storage.ts`. Test-only URL flags only through
  `getTestFlags()`: `?seed=N`, `?fastTimers=1` (animation waits only — never the round clock or
  the step limits), `?event=glitch|emergency|power|overheat-fast|overheat-slow|none` (`none`: a
  round without surprises), `?transition=<title>&mood=<mood>` (loops one result transition;
  `&half=1` inside a duel half),
  `?intro=1` (plays the APK's opening in the browser).
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
  still across the switch; only its status light changes.
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
- The red button must read from across the booth: big, 3D arcade look, hazard ring, pulse.
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

1. Matches `docs/YOL-HARITASI.md` (or a decision in its §11).
2. Tests exist for its buttons and rules; `npm run check` is green.
3. The touched screens were clicked through in the browser at 1280×800.
4. The report lists what was tested automatically and what still needs the real tablet (sound
   level, touch feel, brightness, performance of the effects).

Don't commit or push unless the user asks.
