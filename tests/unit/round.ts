// Helpers to drive the reducer through a round in unit tests.
import { gameReducer, INITIAL_STATE, type GameState } from '@/game/engine'
import type { EventPlan, ForcedEvent } from '@/game/events'

export const ROUND = 60_000
export const T0 = 1_000_000
export const NONE: EventPlan = { glitch: null }

/**
 * A round on stage 1, its title card up (the clock stands still until the first step). No
 * Overheat unless asked for: 'natural' uses the real triggers.
 */
export function playing(
  plan: EventPlan = NONE,
  forced: ForcedEvent | 'natural' = 'none',
  roundMs = ROUND,
): GameState {
  const hack = gameReducer(INITIAL_STATE, { type: 'press' })
  return gameReducer(hack, {
    type: 'start',
    now: T0,
    roundMs,
    seed: 7,
    plan,
    forced: forced === 'natural' ? undefined : forced,
  })
}

/**
 * Plays the stage on screen: the clock runs for `ms`, `ok` steps right and `miss` wrong, then
 * the stage ends at `now + ms`. Returns the state with the grade card up.
 */
export function stage(state: GameState, ok: number, miss: number, now: number, ms = 5000) {
  let s = gameReducer(state, { type: 'hold', now, on: false })
  if (ok) s = gameReducer(s, { type: 'score', ok, miss: 0 })
  if (miss) s = gameReducer(s, { type: 'score', ok: 0, miss, note: `${miss} hata` })
  return gameReducer(s, { type: 'stageDone', now: now + ms })
}

/** Plays the stage and moves on after its grade card. */
export function playStage(state: GameState, ok: number, miss: number, now: number, ms = 5000) {
  const ended = stage(state, ok, miss, now, ms)
  return gameReducer(ended, { type: 'next', now: now + ms + 2000 })
}
