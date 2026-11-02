---
name: kernelpanic-button-tests
description: >-
  Use whenever a KERNEL PANIC screen, button, timer or surprise event is added or changed, or
  when asked to test buttons, pages or flows. Explains the per-button checks, where tests go,
  fake timers for the round clock and events, forced events via URL flags, offline checks and
  the manual click-through on the 1280×800 tablet profile.
---

# Button, screen and event tests

## The checks every button gets

| #   | Check                              | How                                                                    |
| --- | ---------------------------------- | ---------------------------------------------------------------------- |
| 1   | Visible, touch area ≥ 64×64 px     | E2E `boundingBox()` after entrance animations                          |
| 2   | Does the right thing               | E2E: next screen's test id visible; component: reducer state/callback  |
| 3   | Pressed feedback within 100 ms     | `:active` style / pressed state asserted on `pointerdown`              |
| 4   | Double-tap guard                   | Runner ignores taps outside its step; E2E: `dblclick()` on the button   |
| 5   | Inert while resolving              | A step that is decided takes no more taps until the next one comes     |
| 6   | Touch and mouse                    | E2E: both `tap()` and `click()`                                        |
| 7   | Works offline                      | `e2e/*.pwa.spec.ts` with `context.setOffline(true)`                    |

## Where tests go

- `tests/unit/*.test.ts` — pure rules: `gradeOf` / `titleFor`, event triggers (fast/slow
  overheat, power streak, random slots with a seed), cooling ±5 s (`coolingShiftMs`), emergency
  ±seconds, duel points and winner (`duel.test.ts`), duel content per player
  (`players.test.ts`: same difficulty, other answers, Işın Yolu the same), the
  stage generators (`stages.test.ts`: every beam line solvable, …), reducer transitions, the
  five stage runners with fake timers (`runners.test.ts`: a mistake or a step running out
  only costs that step, the clock is held while the player only watches), and the eye's
  geometry (`eye.test.ts`: never the same look twice, `towards`, lids, blink).
- `tests/component/*.test.tsx` — RTL + `userEvent` per screen.
- `e2e/<screen>.spec.ts` — the booth loop on the tablet profile: attract → hack → 5 stages →
  result → report → restart, idle reset after 25 s, the home button (hold 1 s).
- `e2e/attract.spec.ts` — the eye (`btn-panic`): it looks somewhere else every 3 s
  (`data-look`, with `page.clock.fastForward`), it looks where the screen is touched (`irisX()`
  reads the iris' position), it squints after 20 s idle (`data-nudge`); the logo chip stays
  inside the game during a screen switch (a letterboxed viewport, slowed View Transitions,
  screenshots of the empty bar).
- `e2e/events.spec.ts` — every event forced with `?event=…&seed=N`; natural seeded rounds played
  to the end with `playStages()`; every result transition over every background via
  `?transition=<title>&mood=<mood>`.
- `e2e/settings.spec.ts` — the gear (`btn-settings`: round length and sound only), the logo
  (5 taps = "sudo"; holding it opens nothing), the brand line, "Bizi takip edin" (`btn-social`,
  the QR dialog) and the home button.
- `e2e/duel.spec.ts` — the mode switch, both eyes needed to start (a lone press resets; the
  ready eye takes the player's colour and looks across), the right half mirroring the left
  (`stage-card` accent on the outer edge), the
  dead pixel elsewhere on each half, one full duel round per half with its own ending
  (`result-transition` inside `half-1`), the waiting card, the winner screen and restart, no
  Emergency in a duel, the home button clear of both halves' texts, every ending fitting a half
  (`?transition=<title>&half=1`).
- `e2e/boot.spec.ts` — the APK's opening via `?intro=1` (plays, a tap skips it, sets
  `data-boot`).
- `e2e/*.pwa.spec.ts` — production build + service worker (URL flags are off there).

## Always

- Import `test` / `expect` from `e2e/fixtures.ts`: it fails a test on any console error or
  page error (e.g. React key warnings) — never from `@playwright/test` directly.
- Core-loop specs use `ROUND_URL` (`?seed=4&fastTimers=1&event=none`): no random events.
  `playStages(page, plan, until)` plays the stages through their test hooks (`data-odd`,
  `data-seq`, `data-need`, `data-correct`, `data-eff`; test builds only): `'right'`, `'wrong'`
  or `{ wrong: n }`, per stage (`pixel`, `colours`, `beam`, `trap`, `orders`) or for all. Specs that read a stage's grade card use `REAL_URL`
  (under fastTimers the card is up for 0.2 s); otherwise read the HUD module's colour.
- Duel: `startDuel(page)` presses both buttons; every helper (`step`, `playStages`) takes a
  `scope` (`page.getByTestId('half-1')`) to play one half; `playStages` also stops at
  `duel-waiting`.

## Patterns

Round clock (Playwright fake clock):

```ts
await page.clock.install()
await page.goto('/?seed=4&fastTimers=1&event=none')
await page.getByTestId('btn-panic').tap()
await page.clock.fastForward(51_000) // the stages run out on their own, the clock turns red
await expect(page.getByTestId('play')).toHaveAttribute('data-low', 'true')
```

The round clock never stops a round: once it runs out it counts on (`+00:07`) and every stage
is still played (ALMOST A LEGEND / TURN IT OFF AND ON come from finishing late).

Use `page.clock.fastForward(ms)` for big jumps (the round clock, 20 s nudge, 25 s idle reset):
`runFor` fires every 100 ms interval and every animation frame of the code rain on the way and
blows the 30 s test budget. The fake clock still flows in real time: read what the timer shows
(`aria-label`) instead of assuming it.

Under `?fastTimers=1` the reveals and cards are up for a tenth of their time: wait for a step to
be decided (the stage's dots) or for the next stage, never for a short-lived state.

**Never race a step clock from outside** (CI runs on slow 2-core machines, where a few round
trips between the test and the page can outlast a 2.6 s command or a 5 s screen):

- hold the page's clock: `page.clock.install()` before `goto`, `holdClock(page)` once the step
  is up, then move time only with `page.clock.runFor(ms)`;
- or act inside the page in one `evaluate`: several taps in a row (`dispatchEvent` of
  `PointerEvent`s), a `MutationObserver` noting every short state the moment it is drawn;
- assert what the round guarantees, not what a fast machine happens to reach (e.g. "player 1
  saved more than player 2", not "player 1 saved 100 %").

Check timing-heavy specs once with a slow CPU (a temporary `Emulation.setCPUThrottlingRate`,
rate 4, through a CDP session in the fixture) and `--workers=2`.

Emergency (`?event=emergency`, solo): 4 s to read (`data-reading="true"`, no countdown), then
8 s to choose; test the auto-pick with `page.clock.fastForward`.

Forced events: `?event=overheat-slow` shows the alarm, then "DOKUNMA!" for 3 s and +5 s when
nothing touched the screen, no penalty for a touch; `?event=overheat-fast` takes −5 s for a
touch and gives nothing for holding off; `?event=emergency` offers both channels before stage 2
and picks SAFE after 4 + 8 s (risky = 5–6–7 colours, +5 s if green, −3 s if not); `?event=glitch`
makes stage 2's pads trade places in layer 2 too; `?event=power` plays only an animation after
one green stage (timer unchanged).

Unit timers: `vi.useFakeTimers()` … `vi.advanceTimersByTime(ms)` … `vi.useRealTimers()`.

## Run

```bash
npm test                                   # unit + component
npm run e2e                                # everything
npx playwright test e2e/boot.spec.ts       # one file
npm run check                              # before calling a day's work done
```

## Manual click-through (every UI change)

`npm run dev`, open `http://localhost:5174/` at 1280×800 and tap every button on the touched
screens. Things that need the real tablet go into the report: sound level in a noisy room,
touch feel of the eye and the final's button, flash intensity, effect smoothness.

## Never

- Delete, skip or loosen a failing test to get green.
- Shorten the round clock or the step limits with `?fastTimers` (animation waits only).
- Read test-only flags anywhere except `getTestFlags()`.
