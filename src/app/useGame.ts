import { useMemo, useReducer } from 'react'
import { gameReducer, INITIAL_STATE, type GameState } from '@/game/engine'
import { planEvents, type EventPlan, type ForcedEvent } from '@/game/events'
import { seededRng, type Rng } from '@/game/rng'
import type { Player } from '@/game/stages/players'
import { readRoundSeconds } from './settings'
import { getTestFlags } from './testFlags'

/** Everything a round starts from; the duel gives both players the same one. */
export interface RoundSetup {
  now: number
  roundMs: number
  seed: number
  plan: EventPlan
  forced: ForcedEvent | undefined
}

export interface GameActions {
  press: () => void
  /**
   * Starts a round; with a setup, exactly that one (both duel players get the same, each as
   * their own `player`: same difficulty, other answers).
   */
  start: (setup?: RoundSetup, player?: Player) => void
  hold: (on: boolean) => void
  score: (ok: number, miss: number, note?: string) => void
  stageDone: () => void
  next: () => void
  chooseChannel: (channel: 'safe' | 'risky') => void
  overheatReady: () => void
  coolingDone: (ok: boolean) => void
  openReport: () => void
  closeReport: () => void
  restart: () => void
}

/** A fresh random source per round: seeded under ?seed=N (tests), Math.random at the booth. */
function roundRng(): Rng {
  const { seed } = getTestFlags()
  return seed === undefined ? Math.random : seededRng(seed)
}

/** A new round: its content seed, its surprise events and its length (a duel: no Emergency). */
export function newRound(duel = false): RoundSetup {
  const { event } = getTestFlags()
  const rng = roundRng()
  return {
    now: Date.now(),
    roundMs: readRoundSeconds() * 1000,
    seed: Math.floor(rng() * 0xffffffff),
    plan: planEvents(rng, event, duel),
    forced: duel && event === 'emergency' ? 'none' : event,
  }
}

/** The game state machine wired to the clock and the round's random content. */
export function useGame(): [GameState, GameActions] {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE)

  const actions = useMemo<GameActions>(() => {
    return {
      press: () => dispatch({ type: 'press' }),
      start: (setup = newRound(), player = 0) => dispatch({ type: 'start', ...setup, player }),
      hold: (on) => dispatch({ type: 'hold', now: Date.now(), on }),
      score: (ok, miss, note) => dispatch({ type: 'score', ok, miss, note }),
      stageDone: () => dispatch({ type: 'stageDone', now: Date.now() }),
      next: () => dispatch({ type: 'next', now: Date.now() }),
      chooseChannel: (channel) => dispatch({ type: 'chooseChannel', now: Date.now(), channel }),
      overheatReady: () => dispatch({ type: 'overheatReady', now: Date.now() }),
      coolingDone: (ok) => dispatch({ type: 'coolingDone', now: Date.now(), ok }),
      openReport: () => dispatch({ type: 'openReport' }),
      closeReport: () => dispatch({ type: 'closeReport' }),
      restart: () => dispatch({ type: 'restart' }),
    }
  }, [])

  return [state, actions]
}
