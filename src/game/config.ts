// Every tunable number of the game in one place (docs/YOL-HARITASI.md). Balance changes after
// the tablet test happen here, not in the screens.

import type { RoundSeconds, StageId, Variant } from './types'

// ── Round (§4) ─────────────────────────────────────────────────────────────────────────────
/** The five stages, always in this order; Basma Dedik is the final (§2.3). */
export const STAGE_ORDER: readonly StageId[] = ['piksel', 'renk', 'isin', 'tuzak', 'basma']
export const STAGE_COUNT = STAGE_ORDER.length
export const ROUND_SECONDS_OPTIONS: readonly RoundSeconds[] = [45, 60, 75]
export const DEFAULT_ROUND_SECONDS: RoundSeconds = 60

// ── Grades (§5.1): the share of right steps in a stage ──────────────────────────────────────
/** More than this share (but not all) is "good" — the lime between green and orange. */
export const GRADE_GOOD_ABOVE = 0.75
/** From this share up to GRADE_GOOD_ABOVE is "pass" (orange); below it is "fail" (red). */
export const GRADE_PASS_FROM = 0.5

// ── Stages (§2.3). Step limits are game rules: ?fastTimers never shortens them. ───────────────
export const PIKSEL = {
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

export const RENK: {
  lengths: Record<Variant, readonly number[]>
  onMs: Record<Variant, readonly number[]>
  swap: Record<Variant, readonly boolean[]>
  gapMs: number
  idleMs: number
} = {
  /** Three layers; the second one always has the same colour twice in a row. */
  lengths: { normal: [3, 5, 5], safe: [3, 4, 4], risky: [5, 6, 7] },
  /** How long each colour lights up while the player watches (animation wait). */
  onMs: { normal: [560, 400, 400], safe: [600, 480, 480], risky: [440, 330, 330] },
  /** The pads trade places after the show (Glitch adds the second layer). */
  swap: { normal: [false, false, true], safe: [false, false, true], risky: [false, true, true] },
  gapMs: 150,
  /** Each colour has to be tapped within this long after the previous one. */
  idleMs: 3000,
}

/** [columns, rows, turns on the path, decoy mirrors, walls] for each of the three lines. */
export type LineSize = readonly [number, number, number, number, number]

export const ISIN: {
  lines: Record<Variant, readonly LineSize[]>
  limitsMs: readonly number[]
  glitchFlipMs: number
} = {
  lines: {
    normal: [
      [6, 4, 2, 1, 0],
      [7, 5, 4, 2, 2],
      [8, 5, 5, 4, 2],
    ],
    safe: [
      [5, 3, 2, 0, 0],
      [6, 4, 2, 2, 1],
      [6, 4, 3, 2, 1],
    ],
    risky: [
      [7, 5, 3, 3, 2],
      [8, 6, 4, 5, 3],
      [9, 6, 6, 6, 3],
    ],
  },
  /** Each line has its own clock. */
  limitsMs: [8000, 10000, 12000],
  /** Glitch: one mirror turns by itself this often. */
  glitchFlipMs: 2200,
}

export const TUZAK = {
  /** Three words per part: first tap what the word says, then the colour it is painted in. */
  perPart: 3,
  limitMs: { normal: 2600, safe: 3000, risky: 1800 } as Record<Variant, number>,
} as const

export const BASMA = {
  /** BASILI TUT: hold this long. */
  holdMs: 2000,
  /** Command windows (BASMA! = do not touch for this long). */
  windowMs: { bas: 2400, uc: 2600, yesil: 3300, tut: 3800, basma: 2000 },
  /** TERS MOD: BAS means "don't" (2 s), BASMA! means "press" (2.2 s). */
  invertedMs: { bas: 2000, basma: 2200 },
  /** YEŞİLDE BAS: the ring goes red → amber → green on this cycle. */
  ringCycleMs: 1500,
} as const

// ── Events (§3) ────────────────────────────────────────────────────────────────────────────
export const MAX_EVENTS_PER_ROUND = 2
/** At least one random event (glitch or emergency) per round. */
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

// EMERGENCY MODE (§3.3) — safe (easy) or risky (hardest) version of the stage; solo only.
/** The screen freezes and the choice is read first: no countdown yet (the clock stands still). */
export const EMERGENCY_READ_MS = 4000
/** Then this long to choose before the system picks the safe channel. */
export const EMERGENCY_CHOOSE_MS = 8000
/** The risky channel pays off when the stage ends green (good or perfect), else costs time. */
export const RISKY_BONUS_SECONDS = 5
export const RISKY_PENALTY_SECONDS = 3

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
/** The red button's press + CRT power-off before the hack screen (§2.2). */
export const PRESS_MS = 600
/** Hack intro: SYSTEM FAILURE + log lines + message, then the 3-2-1 countdown (§2.2). */
export const HACK_INTRO_MS = 2600
export const COUNTDOWN_STEP_MS = 650
export const DISCLAIMER_ROTATE_MS = 4000
/** Duel: a player who pressed waits this long for the other, then the buttons let go. */
export const DUEL_READY_WAIT_MS = 12_000
/** The red button shakes ("bas artık") after this long without a touch. */
export const ATTRACT_NUDGE_MS = 20_000
/** Result and report screens go back to the button after this long without a touch. */
export const IDLE_RESET_MS = 25_000
/** Taps on the logo for the "sudo" easter egg. */
export const EASTER_EGG_TAPS = 5
