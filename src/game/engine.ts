// The booth loop as a pure state machine (docs/ROADMAP.md §2–§3): attract → hack → play →
// result ⇄ report → attract. A round is five stages, always in the same order and always played
// to the end; each stage is a small game whose screen reports every step (`score`), when the
// player only watches (`hold`: the round clock stands still) and when it is over (`stageDone`).
// Time comes in with every action (`now`, ms), so the reducer has no clock of its own and every
// rule is unit-testable.

import {
  FAST_AFTER_STAGE,
  FAST_REMAINING_RATIO,
  MAX_EVENTS_PER_ROUND,
  POWER_STREAK,
  SLOW_MIN_LEFT,
  SLOW_REMAINING_RATIO,
  STAGE_COUNT,
  STAGE_ORDER,
} from './config'
import { coolingShiftMs, countedEvents, type EventPlan, type ForcedEvent } from './events'
import { gradeOf, isGreen, stageShare } from './grades'
import type { Player } from './stages/players'
import type { EventKind, Phase, RoundOutcome, StageId, StageRecord } from './types'

export type OverheatMode = 'fast' | 'slow'

/** An event that takes the stage's place between two stages (§3.1). */
export type Overlay = {
  kind: 'overheat'
  mode: OverheatMode
  step: 'alarm' | 'cooling'
  since: number
}

/** The steps of the stage being played. */
export interface Tally {
  ok: number
  miss: number
  notes: readonly string[]
}

/** A change of the round clock, shown as a floating "+8 sn" / "−3 sn". */
export interface TimeShift {
  deltaMs: number
  at: number
}

export interface GameState {
  phase: Phase
  /** Rounds started on this screen session (the result intro plays once per round). */
  round: number
  /** Configured round length in ms (45/60/75 s). */
  roundMs: number
  /** Seed of the round's content: every stage builds its screens from it. */
  seed: number
  /** Solo (0) or one of the duel's players: the same round, their own answers (§2.5). */
  player: Player
  /** The stage on screen (0–4). */
  index: number
  tally: Tally
  /** Finished stages, in order. */
  stages: readonly StageRecord[]
  /** The stage on screen is over: its grade card is up until `next`. */
  ended: boolean
  /** The round clock reaches zero at this time (later while it stands still). */
  endsAt: number
  /** The round clock stands still since this time (intros, watching, cards, events). */
  pausedAt: number | null
  /** Green stages in a row (Power Restored). */
  streak: number
  /** Set when the last stage ends. */
  outcome: RoundOutcome | null

  // ── events (§3) ──
  plan: EventPlan
  forced: ForcedEvent | undefined
  overlay: Overlay | null
  /** Events that happened this round, in order (badges on the result, transition mood). */
  events: readonly EventKind[]
  /** An Overheat was triggered by the stage that just ended; it starts on `next`. */
  pendingOverheat: OverheatMode | null
  cooling: { mode: OverheatMode; ok: boolean } | null
  lastShift: TimeShift | null
  /** When Power Restored fired (animation only). */
  powerAt: number | null
}

export type GameAction =
  | { type: 'press' }
  | {
      type: 'start'
      now: number
      roundMs: number
      seed: number
      plan?: EventPlan
      forced?: ForcedEvent
      player?: Player
    }
  /** The player only watches (true) or plays again (false). */
  | { type: 'hold'; now: number; on: boolean }
  | { type: 'score'; ok: number; miss: number; note?: string }
  | { type: 'stageDone'; now: number }
  | { type: 'next'; now: number }
  | { type: 'overheatReady'; now: number }
  | { type: 'coolingDone'; now: number; ok: boolean }
  | { type: 'openReport' }
  | { type: 'closeReport' }
  | { type: 'restart' }

const NO_PLAN: EventPlan = { glitch: null }
const NO_TALLY: Tally = { ok: 0, miss: 0, notes: [] }
/** Report lines kept per stage (the report has room for two). */
const MAX_NOTES = 4

export const INITIAL_STATE: GameState = {
  phase: 'attract',
  round: 0,
  roundMs: 0,
  seed: 0,
  player: 0,
  index: 0,
  tally: NO_TALLY,
  stages: [],
  ended: false,
  endsAt: 0,
  pausedAt: null,
  streak: 0,
  outcome: null,
  plan: NO_PLAN,
  forced: undefined,
  overlay: null,
  events: [],
  pendingOverheat: null,
  cooling: null,
  lastShift: null,
  powerAt: null,
}

export function stageAt(index: number): StageId {
  return STAGE_ORDER[index]
}

/** Round time left in ms — negative once the clock has run out; frozen once decided. */
export function clockMs(state: GameState, now: number): number {
  if (state.outcome) return state.outcome.remainingMs
  return state.endsAt - (state.pausedAt ?? now)
}

/** The stage on screen is the glitched one (§3.2). */
export function isGlitchStage(state: GameState, index = state.index): boolean {
  return state.plan.glitch === index + 1
}

/** System integrity on the HUD, 0–100: the share of right steps over the five stages. */
export function integrity(stages: readonly StageRecord[]): number {
  return Math.round((stages.reduce((sum, r) => sum + stageShare(r), 0) / STAGE_COUNT) * 100)
}

function pause(state: GameState, now: number): Partial<GameState> {
  return state.pausedAt === null ? { pausedAt: now } : {}
}

function resume(state: GameState, now: number): Partial<GameState> {
  if (state.pausedAt === null) return {}
  return { pausedAt: null, endsAt: state.endsAt + Math.max(0, now - state.pausedAt) }
}

function shift(state: GameState, deltaMs: number, now: number): Partial<GameState> {
  return { endsAt: state.endsAt + deltaMs, lastShift: { deltaMs, at: now } }
}

/** The stage on screen takes steps (not over, no event panel, round not decided). */
function playable(state: GameState): boolean {
  return state.phase === 'play' && !state.ended && !state.overlay && !state.outcome
}

/** Does the stage that just ended (number `slot`) start an Overheat? (§3.1) */
function overheatAfter(state: GameState, slot: number): OverheatMode | null {
  if (state.events.includes('overheat')) return null
  if (state.forced === 'overheat-fast') return slot === 1 ? 'fast' : null
  if (state.forced === 'overheat-slow') return slot === 1 ? 'slow' : null
  if (state.forced) return null
  // never right before the final
  if (STAGE_COUNT - slot < SLOW_MIN_LEFT) return null
  // the per-round limit counts the random events still to come as well
  const planned = state.plan.glitch !== null && state.plan.glitch > slot ? 1 : 0
  if (countedEvents(state.events) + planned >= MAX_EVENTS_PER_ROUND) return null

  const left = state.endsAt - (state.pausedAt ?? 0)
  if (slot === FAST_AFTER_STAGE && left > state.roundMs * FAST_REMAINING_RATIO) return 'fast'
  if (left < state.roundMs * SLOW_REMAINING_RATIO) return 'slow'
  return null
}

/** Moves on to stage `index` (a glitched one counts its Glitch as it comes up, §3.2). */
function enterStage(state: GameState, index: number, now: number): GameState {
  const slot = index + 1
  const next: GameState = {
    ...state,
    ...pause(state, now),
    index,
    tally: NO_TALLY,
    ended: false,
    overlay: null,
  }
  if (state.plan.glitch === slot && !state.events.includes('glitch')) {
    return { ...next, events: [...state.events, 'glitch'] }
  }
  return next
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'press':
      return state.phase === 'attract'
        ? { ...INITIAL_STATE, phase: 'hack', round: state.round }
        : state

    case 'start':
      if (state.phase !== 'hack') return state
      return enterStage(
        {
          ...INITIAL_STATE,
          phase: 'play',
          round: state.round + 1,
          roundMs: action.roundMs,
          seed: action.seed,
          player: action.player ?? 0,
          endsAt: action.now + action.roundMs,
          // the first stage's title card is up: the clock starts with the first step
          pausedAt: action.now,
          plan: action.plan ?? NO_PLAN,
          forced: action.forced,
        },
        0,
        action.now,
      )

    case 'hold':
      if (!playable(state)) return state
      return { ...state, ...(action.on ? pause(state, action.now) : resume(state, action.now)) }

    case 'score': {
      if (!playable(state)) return state
      const notes = action.note ? [...state.tally.notes, action.note] : state.tally.notes
      return {
        ...state,
        tally: {
          ok: state.tally.ok + action.ok,
          miss: state.tally.miss + action.miss,
          notes: notes.slice(0, MAX_NOTES),
        },
      }
    }

    case 'stageDone': {
      if (!playable(state)) return state
      const slot = state.index + 1
      const record: StageRecord = {
        slot,
        stage: stageAt(state.index),
        glitch: isGlitchStage(state),
        ...state.tally,
      }
      const green = isGreen(gradeOf(record.ok, record.ok + record.miss))
      const paused = { ...state, ...pause(state, action.now) }
      const streak = green ? state.streak + 1 : 0
      // Power Restored: animation only, once per round, never after the final (§3.4)
      const powerStreak = state.forced === 'power' ? 1 : POWER_STREAK
      const power =
        green && streak >= powerStreak && slot < STAGE_COUNT && !state.events.includes('power')
      const next: GameState = {
        ...paused,
        stages: [...state.stages, record],
        tally: NO_TALLY,
        ended: true,
        streak,
        events: power ? [...state.events, 'power'] : state.events,
        powerAt: power ? action.now : state.powerAt,
      }
      if (slot >= STAGE_COUNT) {
        return {
          ...next,
          outcome: {
            stages: next.stages,
            remainingMs: next.endsAt - (next.pausedAt ?? action.now),
            roundMs: state.roundMs,
          },
        }
      }
      return { ...next, pendingOverheat: overheatAfter(next, slot) }
    }

    case 'next': {
      if (state.phase !== 'play' || !state.ended || state.overlay) return state
      if (state.outcome) return { ...state, phase: 'result' }
      // Overheat: the clock stays stopped through the alarm and the cooling (§3.1)
      if (state.pendingOverheat) {
        return {
          ...state,
          pendingOverheat: null,
          events: [...state.events, 'overheat'],
          overlay: {
            kind: 'overheat',
            mode: state.pendingOverheat,
            step: 'alarm',
            since: action.now,
          },
        }
      }
      return enterStage(state, state.index + 1, action.now)
    }

    case 'overheatReady':
      if (state.overlay?.kind !== 'overheat' || state.overlay.step !== 'alarm') return state
      return { ...state, overlay: { ...state.overlay, step: 'cooling', since: action.now } }

    case 'coolingDone': {
      if (state.overlay?.kind !== 'overheat' || state.overlay.step !== 'cooling') return state
      const delta = coolingShiftMs(state.overlay.mode, action.ok)
      const change = delta ? shift(state, delta, action.now) : {}
      return enterStage(
        { ...state, ...change, cooling: { mode: state.overlay.mode, ok: action.ok } },
        state.index + 1,
        action.now,
      )
    }

    case 'openReport':
      return state.phase === 'result' ? { ...state, phase: 'report' } : state

    case 'closeReport':
      return state.phase === 'report' ? { ...state, phase: 'result' } : state

    case 'restart':
      return { ...INITIAL_STATE, round: state.round }
  }
}
