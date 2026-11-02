// Domain model of KERNEL PANIC (docs/ROADMAP.md §2–§6).

/** Round length chosen in the hidden settings (§1). */
export type RoundSeconds = 45 | 60 | 75

/** Screens of the booth loop, in order (§2). */
export type Phase = 'attract' | 'hack' | 'play' | 'result' | 'report'

/** The five stages of a round, always in this order (§2.3). */
export type StageId = 'pixel' | 'colours' | 'beam' | 'trap' | 'orders'

/**
 * How a stage went, from its share of right steps (§5.1): all right, more than 75 %, 50–75 %,
 * less than half. Every stage is played to its end; a mistake only costs that step.
 */
export type Grade = 'perfect' | 'good' | 'pass' | 'fail'

/**
 * Surprise events (§3). Overheat and power depend on how the player plays; the glitch is random.
 * (Emergency, a safe/risky choice of the stage's version, left the game in Faz 10.)
 */
export type EventKind = 'overheat' | 'glitch' | 'power'

/** Result titles (§5.1). */
export type TitleId =
  | 'system-savior'
  | 'last-second-hero'
  | 'all-systems-go'
  | 'one-bug-left'
  | 'barely-booted'
  | 'safe-mode'
  | 'error-404'
  | 'kernel-panic'
  | 'almost-a-legend'
  | 'turn-it-off-and-on'

/** One finished stage, for the HUD, the result and the error report (§5, §6). */
export interface StageRecord {
  /** 1–5: position in the round ("AŞAMA n/5"). */
  slot: number
  stage: StageId
  glitch: boolean
  /** Steps done right. */
  ok: number
  /** Steps missed (wrong, too late, or left over after a broken sequence). */
  miss: number
  /** Error report lines: what went wrong in this stage. */
  notes: readonly string[]
}

/** What the title and the result screen are computed from. */
export interface RoundOutcome {
  stages: readonly StageRecord[]
  /** Round time left when the last stage ended, in ms; zero or less = the clock ran out. */
  remainingMs: number
  /** The configured round length in ms (45/60/75 s, without bonuses). */
  roundMs: number
}
