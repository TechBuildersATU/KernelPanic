// Surprise events (docs/ROADMAP.md §3): which stages get a random event, the cooling bonus
// and the background "mood" the result transition picks up.

import {
  COOLING_FAST_PENALTY_SECONDS,
  COOLING_SLOW_BONUS_SECONDS,
  RANDOM_EVENT_SLOTS,
} from './config'
import { shuffle, type Rng } from './rng'
import type { EventKind } from './types'

/** Test-only: force one event (?event=…), or 'none' for a round without surprises. */
export type ForcedEvent = 'glitch' | 'power' | 'overheat-fast' | 'overheat-slow' | 'none'

/** The stage (1–5) that gets the random event, or null. */
export interface EventPlan {
  glitch: number | null
}

/**
 * The random event (§3): a Glitch on one of stages 2–4, by their weights — in a solo round and in
 * the duel alike (the same stage for both players). Emergency left the game in Faz 10.
 */
export function planEvents(rng: Rng, forced?: ForcedEvent): EventPlan {
  if (forced === 'glitch') return { glitch: 2 }
  if (forced) return { glitch: null }

  const slots = Object.keys(RANDOM_EVENT_SLOTS).map(Number)
  let picked = slots.filter((slot) => rng() < RANDOM_EVENT_SLOTS[slot])
  if (picked.length === 0) {
    // at least one random event per round: weighted pick
    const total = slots.reduce((sum, slot) => sum + RANDOM_EVENT_SLOTS[slot], 0)
    let roll = rng() * total
    picked = [slots.find((slot) => (roll -= RANDOM_EVENT_SLOTS[slot]) < 0) ?? slots[0]]
  }
  return { glitch: shuffle(picked, rng)[0] }
}

/**
 * What the Overheat cooling does to the round clock (§3.1): too slow → holding still earns
 * +5 s, a touch costs nothing; too fast → holding still earns nothing, a touch costs −5 s.
 */
export function coolingShiftMs(mode: 'fast' | 'slow', held: boolean): number {
  if (mode === 'slow') return held ? COOLING_SLOW_BONUS_SECONDS * 1000 : 0
  return held ? 0 : -COOLING_FAST_PENALTY_SECONDS * 1000
}

/** Background the result transition must match (§5.3): Overheat > Glitch > Power. */
export type Mood = 'overheat' | 'glitch' | 'power' | 'normal'

const PRIORITY: readonly EventKind[] = ['overheat', 'glitch', 'power']

export function moodOf(events: readonly EventKind[]): Mood {
  return PRIORITY.find((kind) => events.includes(kind)) ?? 'normal'
}

/** Events that count towards the per-round limit (Power Restored is only an animation). */
export function countedEvents(events: readonly EventKind[]): number {
  return events.filter((kind) => kind !== 'power').length
}
