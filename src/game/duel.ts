import { STAGE_COUNT } from './config'
import { stageShare } from './grades'
import type { RoundOutcome } from './types'

// The duel (docs/ROADMAP.md §2.5): two players, the same five stages side by side. Who
// saved more of the system wins; on equal points the one who finished with more time left.

export type DuelWinner = 0 | 1 | 'draw'

/** A player's points, 0–100: the share of right steps over the five stages. */
export function duelPoints(outcome: RoundOutcome): number {
  const sum = outcome.stages.reduce((total, r) => total + stageShare(r), 0)
  return Math.round((sum / STAGE_COUNT) * 1000) / 10
}

/** "93,3" — points the Turkish way. */
export function formatPoints(points: number): string {
  return String(points).replace('.', ',')
}

export function duelWinner(a: RoundOutcome, b: RoundOutcome): DuelWinner {
  const pa = duelPoints(a)
  const pb = duelPoints(b)
  if (pa !== pb) return pa > pb ? 0 : 1
  if (a.remainingMs !== b.remainingMs) return a.remainingMs > b.remainingMs ? 0 : 1
  return 'draw'
}
