---
name: kernelpanic-phase
description: >-
  Use when implementing, continuing or finishing a KERNEL PANIC phase ("Faz 1", "Faz 2",
  "Faz 3", "faz 1'den devam et", "start the button screen", "build the events"). Covers
  which spec sections to read, the order of work inside each phase, the cut list when time runs
  out, tests and the definition of done. The booth is on 4 November 2026: three working days.
---

# Building a KERNEL PANIC phase

## 1. Read before writing code

- `docs/ROADMAP.md` — the spec (English; it quotes the game's Turkish texts). §10 is the phase
  plan, §11 the final decisions.
- `docs/sketches/1-4.png` — the club's original sketches (story, phases, events, titles).
- `src/game/stages/` — the five stage games' pure generators; their timed logic lives in
  `src/screens/stages/runners/` (the quiz was retired in Faz 6; archive in `docs/archive/`).
- `src/game/config.ts` — every number. Add new tunables there.

| Phase | Day      | Read                | Main files                                                       |
| ----- | -------- | ------------------- | ---------------------------------------------------------------- |
| Faz 0 | 31 Oct ✅ | §8, §9              | setup, tokens, Stage, config, types, titles, question parser     |
| Faz 1 | 31 Oct ✅ | §2.1–2.3, §4, §7    | `game/engine.ts` (reducer), `game/picker.ts`, `game/rng.ts`, `screens/Attract`, `Hack`, `Play`, simple `Result`, `audio/` |
| Faz 2 | 1 Nov ✅ | §3, §5, §6          | `game/events.ts`, event overlays, `Result` (blocks, title, badges), `Report`, transitions, hidden `Settings` |
| Faz 3 | 1 Nov ✅ | §2–§5, §7          | animation pass: `fx/particles.ts` (sparks, embers, packets, shake), every screen's motion |
| Faz 4 | 1 Nov ✅ | §7, §10–§12         | soft motion pass, APK (`npm run apk`), wake lock, answer verification |
| Faz 5 | 1 Nov ✅ | §5.3, §7            | shared world, cross-fades, music per scene |
| Faz 6 | 2 Nov ✅ | §2.3, §4, §5        | five stages instead of questions (`game/stages`, `screens/stages`), grades, new titles and transitions |
| Faz 7 | 2 Nov ✅ | §2.0–2.5, §3.1      | 1v1 duel (`screens/DuelPlay`, `DuelResult`, `game/duel.ts`, `Play layout="half"`), `fx/BootIntro` + Android splash, logo + credit, gear settings, `SocialDialog`, `HomeButton`, Overheat ±5 |
| Faz 8 | 2 Nov ✅ | §2.1, §2.3, §2.5, §3.3 | duel content per player (`game/stages/players.ts`), no Emergency in a duel, `ResultTransition layout="half"`, Emergency freeze + reading time, Dead Pixel 5 screens, `LogoChip` + Orbitron |
| Faz 9 | 2 Nov ✅ | §2.1, §2.5, §8, §11 #26–29 | the cyber eye (`components/eye`: `Eye`, `geometry`, `motion`), looks every 3 s and at touches; mirrored duel card; logo chip clipped during screen switches; English identifiers, file names and docs (`docs/ROADMAP.md`); speed-independent e2e |
| Faz 10 | 2 Nov ✅ | §2.3, §3, §11 #30–32 | Emergency removed (no `Variant`, one Glitch a round), Dead Pixel colours (`PIXEL_COLOURS`), Beam Path recipes + `mirrorLine()` |
| Final | before release | §10–§12      | real-tablet test: sound level, touch feel, effect smoothness, two players touching at once, balance, backup install |

## 2. Order inside a phase

1. Pure rules first (reducer, picker, event triggers) with unit tests — they are the contract.
2. Then the screen, wired to the reducer, with `data-testid`s from AGENTS.md.
3. Then effects and sound (they must never block input or the clock).
4. E2E for the screen's buttons and timers (`kernelpanic-button-tests` skill).
5. Click through at 1280×800 and screenshot it.

## 3. Cut list (when the day runs out, in this order — §10)

1. The "sudo" easter egg.
2. Per-title transitions → 3 shared ones (success / close call / crash) + the background variant.
3. Background hum and extra effects (alarm and ping stay).
4. Fun-fact notes on the result.
5. Settings other than the round length.

Never cut: the core loop (button → hack → 5 stages → result → error report), the four
events, the offline launch, the idle reset, the tests.

## 4. Verify

```bash
npm run check   # lint → typecheck → unit → build → e2e
```

Then `npm run dev`, open `http://localhost:5174/` at 1280×800 (`?seed=N&fastTimers=1` for a
deterministic, quick round; `?event=…` to force an event), play a full round and tap every
button on the touched screens.

## 5. Report

What was built, test counts (unit / e2e), anything cut or deferred, and the manual checks
still needed on the real tablet (sound level, touch feel, flash intensity, performance). Update
the phase row in `docs/ROADMAP.md` §10 and rebuild its PDF. Write everything but the UI text in
English (identifiers, ids, file names, comments, docs). Do not commit unless the user asks.
