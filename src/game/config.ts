// Every tunable number of the game in one place (docs/ROADMAP.md). Balance changes after
// the tablet test happen here, not in the screens.

import type { RoundSeconds, StageId } from './types'

// ── Round (§4) ─────────────────────────────────────────────────────────────────────────────
/** The five stages, always in this order; Basma Dedik is the final (§2.3). */
export const STAGE_ORDER: readonly StageId[] = ['pixel', 'colours', 'beam', 'trap', 'orders']
export const STAGE_COUNT = STAGE_ORDER.length
export const ROUND_SECONDS_OPTIONS: readonly RoundSeconds[] = [45, 60, 75]
export const DEFAULT_ROUND_SECONDS: RoundSeconds = 60

// ── Grades (§5.1): the share of right steps in a stage ──────────────────────────────────────
/** More than this share (but not all) is "good" — the lime between green and orange. */
export const GRADE_GOOD_ABOVE = 0.75
/** From this share up to GRADE_GOOD_ABOVE is "pass" (orange); below it is "fail" (red). */
export const GRADE_PASS_FROM = 0.5

// ── Stages (§2.3). Step limits are game rules: ?fastTimers never shortens them. ───────────────
export const PIXEL = {
  /** Five screens: two easy, two medium, one to look closely at (same levels as before, more). */
  sizes: [4, 5, 6, 7, 8],
  /** Each screen's level (PIXEL_TAGS): 0 easy, 1 medium, 2 look closely. */
  levels: [0, 0, 1, 1, 2],
  /** Lightness difference of the dead pixel, in %. */
  diffs: [10, 8, 6, 5, 3.5],
  /** Each screen has its own clock. */
  limitsMs: [5000, 5500, 6000, 7000, 8000],
  /** A wrong pixel takes this much off the screen's clock. */
  wrongPenaltyMs: 2000,
  /** The right pixel stays marked this long after the clock ran out (animation wait). */
  revealMs: 1300,
} as const

export const COLOURS = {
  /** Three layers; the second one always has the same colour twice in a row. */
  lengths: [3, 5, 5],
  /** How long each colour lights up while the player watches (animation wait). */
  onMs: [560, 400, 400],
  /** The pads trade places after the show (Glitch adds the second layer). */
  swap: [false, false, true],
  gapMs: 150,
  /** Each colour has to be tapped within this long after the previous one. */
  idleMs: 3000,
} as const

/** [columns, rows, turns on the path, decoy mirrors, walls]: one recipe for a line. */
export type LineSize = readonly [number, number, number, number, number]

export const BEAM: {
  lines: readonly (readonly LineSize[])[]
  limitsMs: readonly number[]
  glitchFlipMs: number
} = {
  /**
   * The three lines, easy → medium → hard. Each line is drawn from its own recipes of about the
   * same difficulty (mirrors to set: 2–3, 3–5, 4–6), and every line is also mirrored left/right
   * and up/down at random, so the beam can come from either side (Faz 10: less repetition).
   */
  lines: [
    [
      [6, 4, 2, 1, 0],
      [6, 4, 3, 0, 1],
      [6, 4, 2, 0, 1],
    ],
    [
      [7, 5, 4, 2, 2],
      [7, 5, 3, 3, 2],
      [7, 5, 5, 1, 2],
    ],
    [
      [8, 5, 5, 4, 2],
      [8, 5, 6, 3, 2],
      [8, 5, 4, 5, 2],
    ],
  ],
  /** Each line has its own clock. */
  limitsMs: [8000, 10000, 12000],
  /** Glitch: one mirror turns by itself this often. */
  glitchFlipMs: 2200,
}

export const TRAP = {
  /** Three words per part: first tap what the word says, then the colour it is painted in. */
  perPart: 3,
  /** Each word has to be answered within this long. */
  limitMs: 2600,
} as const

export const ORDERS = {
  /** BASILI TUT: hold this long. */
  holdMs: 2000,
  /** Command windows (BASMA! = do not touch for this long). */
  windowMs: { press: 2400, triple: 2600, green: 3300, hold: 3800, dontPress: 2000 },
  /** TERS MOD: BAS means "don't" (2 s), BASMA! means "press" (2.2 s). */
  invertedMs: { press: 2000, dontPress: 2200 },
  /** YEŞİLDE BAS: the ring goes red → amber → green on this cycle. */
  ringCycleMs: 1500,
} as const

// ── Events (§3) ────────────────────────────────────────────────────────────────────────────
export const MAX_EVENTS_PER_ROUND = 2
/** Every round gets one random event: a Glitch on one of stages 2–4. */
export const MIN_RANDOM_EVENTS = 1
/**
 * Stages a random event can land on, with their weights. Never stage 1 (warm-up) or 5 (the
 * final, Basma Dedik).
 */
export const RANDOM_EVENT_SLOTS: Readonly<Record<number, number>> = { 2: 0.4, 3: 0.5, 4: 0.4 }

// SYSTEM OVERHEAT (§3.1) — at most once per round, between two stages.
/** "Too fast": after this stage, more than FAST_REMAINING_RATIO of the round is still left. */
export const FAST_AFTER_STAGE = 2
export const FAST_REMAINING_RATIO = 0.8
/** "Too slow": less than this share of the round left while ≥ SLOW_MIN_LEFT stages remain. */
export const SLOW_REMAINING_RATIO = 0.25
export const SLOW_MIN_LEFT = 2
/** Cooling: do not touch the screen for this long (the round clock stands still). */
export const COOLING_MS = 3000
/** Too slow: holding still earns this much time; a touch costs nothing. */
export const COOLING_SLOW_BONUS_SECONDS = 5
/** Too fast: holding still earns nothing; a touch costs this much ("SİSTEM ISINDI"). */
export const COOLING_FAST_PENALTY_SECONDS = 5

// POWER RESTORED (§3.4) — animation only, after this many green stages in a row.
export const POWER_STREAK = 2

// ── Result (§5) ────────────────────────────────────────────────────────────────────────────
/** All five perfect with at least this share of the round left is SYSTEM SAVIOR. */
export const SAVIOR_MIN_REMAINING_RATIO = 0.2
/** Out of time with at least this many green stages is ALMOST A LEGEND. */
export const LEGEND_MIN_GREEN = 3

// ── Play screen (§2.3) ──────────────────────────────────────────────────────────────────────
/** The stage title card before a stage starts (animation wait, the clock stands still). */
export const STAGE_INTRO_MS = 1600
/** The stage's grade card after it ends (animation wait, the clock stands still). */
export const STAGE_END_MS = 1900
/** The timer turns red and ticks every second below this. */
export const LOW_TIME_MS = 10_000

// ── Booth / kiosk (§2.1, §6) ────────────────────────────────────────────────────────────────
/** The eye's press + CRT power-off before the hack screen (§2.2). */
export const PRESS_MS = 600
/** Hack intro: SYSTEM FAILURE + log lines + message, then the 3-2-1 countdown (§2.2). */
export const HACK_INTRO_MS = 2600
export const COUNTDOWN_STEP_MS = 650
export const DISCLAIMER_ROTATE_MS = 4000
/** Duel: a player who pressed waits this long for the other, then the buttons let go. */
export const DUEL_READY_WAIT_MS = 12_000
/** After this long without a touch the eye turns to the visitor, squints and blinks twice. */
export const ATTRACT_NUDGE_MS = 20_000
/** The eye on the button screen looks somewhere else this often (§2.1). */
export const EYE_LOOK_MS = 3000
/** A touch on the button screen: the eye looks there this long before it looks around again. */
export const EYE_TOUCH_LOOK_MS = 1800
/** Result and report screens go back to the button after this long without a touch. */
export const IDLE_RESET_MS = 25_000
/** Taps on the logo for the "sudo" easter egg. */
export const EASTER_EGG_TAPS = 5
