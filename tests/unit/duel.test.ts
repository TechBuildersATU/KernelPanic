import { describe, expect, it } from 'vitest'
import { STAGE_ORDER } from '@/game/config'
import { duelPoints, duelWinner, formatPoints } from '@/game/duel'
import type { RoundOutcome } from '@/game/types'

/** Five stages from right/total pairs. */
function outcome(steps: readonly [number, number][], remainingMs = 10_000): RoundOutcome {
  return {
    stages: steps.map(([ok, total], i) => ({
      slot: i + 1,
      stage: STAGE_ORDER[i],
      variant: 'normal',
      glitch: false,
      ok,
      miss: total - ok,
      notes: [],
    })),
    remainingMs,
    roundMs: 60_000,
  }
}

const ALL: [number, number][] = [
  [3, 3],
  [13, 13],
  [3, 3],
  [6, 6],
  [6, 6],
]

describe('the duel (§2.5)', () => {
  it('points are the share of right steps over the five stages, 0–100', () => {
    expect(duelPoints(outcome(ALL))).toBe(100)
    expect(duelPoints(outcome(ALL.map(([, t]) => [0, t] as [number, number])))).toBe(0)
    expect(duelPoints(outcome([[2, 3], ...ALL.slice(1)]))).toBe(93.3)
    expect(formatPoints(93.3)).toBe('93,3')
  })

  it('more saved wins; equal points → more time left; else a draw', () => {
    const best = outcome(ALL, 5_000)
    const worse = outcome([[2, 3], ...ALL.slice(1)], 30_000)
    expect(duelWinner(best, worse)).toBe(0)
    expect(duelWinner(worse, best)).toBe(1)
    expect(duelWinner(outcome(ALL, 12_000), outcome(ALL, 9_000))).toBe(0)
    expect(duelWinner(outcome(ALL, -2_000), outcome(ALL, 1_000))).toBe(1)
    expect(duelWinner(outcome(ALL, 4_000), outcome(ALL, 4_000))).toBe('draw')
  })
})
