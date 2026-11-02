import { describe, expect, it } from 'vitest'
import { clockMs, gameReducer, INITIAL_STATE, integrity, type GameState } from '@/game/engine'
import { titleFor } from '@/game/titles'
import { playing, playStage, ROUND, stage, T0 } from './round'

describe('gameReducer — booth loop (§2)', () => {
  it('press → hack → stage 1, the clock standing still under its title card', () => {
    const hack = gameReducer(INITIAL_STATE, { type: 'press' })
    expect(hack.phase).toBe('hack')
    const state = playing()
    expect(state).toMatchObject({ phase: 'play', index: 0, variant: 'normal', seed: 7 })
    expect(clockMs(state, T0 + 15_000)).toBe(ROUND)
  })

  it('a round knows its player: solo by default, or one of the duel’s two', () => {
    const hack = gameReducer(INITIAL_STATE, { type: 'press' })
    expect(playing().player).toBe(0)
    const two = gameReducer(hack, { type: 'start', now: T0, roundMs: ROUND, seed: 1, player: 2 })
    expect(two.player).toBe(2)
    expect(gameReducer(two, { type: 'restart' }).player).toBe(0)
  })

  it('ignores press outside attract and start outside hack', () => {
    const state = playing()
    expect(gameReducer(state, { type: 'press' })).toBe(state)
    expect(gameReducer(INITIAL_STATE, { type: 'start', now: T0, roundMs: ROUND, seed: 1 })).toBe(
      INITIAL_STATE,
    )
  })

  it('the clock runs only while the player plays (hold on/off)', () => {
    let state = gameReducer(playing(), { type: 'hold', now: T0 + 1000, on: false })
    expect(clockMs(state, T0 + 4000)).toBe(ROUND - 3000)
    state = gameReducer(state, { type: 'hold', now: T0 + 4000, on: true })
    expect(clockMs(state, T0 + 9000)).toBe(ROUND - 3000)
    state = gameReducer(state, { type: 'hold', now: T0 + 9000, on: false })
    expect(clockMs(state, T0 + 10_000)).toBe(ROUND - 4000)
    // holding twice changes nothing
    expect(gameReducer(state, { type: 'hold', now: T0 + 10_000, on: false })).toEqual(state)
  })

  it('a stage counts every step; a mistake costs only that step', () => {
    let state = gameReducer(playing(), { type: 'hold', now: T0, on: false })
    state = gameReducer(state, { type: 'score', ok: 1, miss: 0 })
    state = gameReducer(state, { type: 'score', ok: 0, miss: 1, note: '2. ekran · süre bitti' })
    state = gameReducer(state, { type: 'score', ok: 1, miss: 0 })
    expect(state.tally).toEqual({ ok: 2, miss: 1, notes: ['2. ekran · süre bitti'] })
    state = gameReducer(state, { type: 'stageDone', now: T0 + 9000 })
    expect(state.ended).toBe(true)
    expect(state.stages).toEqual([
      {
        slot: 1,
        stage: 'pixel',
        variant: 'normal',
        glitch: false,
        ok: 2,
        miss: 1,
        notes: ['2. ekran · süre bitti'],
      },
    ])
    // the grade card holds the clock and takes no more steps
    expect(clockMs(state, T0 + 20_000)).toBe(ROUND - 9000)
    expect(gameReducer(state, { type: 'score', ok: 1, miss: 0 })).toBe(state)
  })

  it('next moves on through all five stages in order', () => {
    let state = playing()
    const order: string[] = []
    for (let i = 0; i < 5; i++) {
      order.push(`${state.index}`)
      state = playStage(state, 3, 0, T0 + i * 10_000, 4000)
    }
    expect(order).toEqual(['0', '1', '2', '3', '4'])
    expect(state.phase).toBe('result')
    expect(state.stages.map((r) => r.stage)).toEqual(['pixel', 'colours', 'beam', 'trap', 'orders'])
  })

  it('the last stage decides the round: 5 × 4 s of play → SYSTEM SAVIOR with 40 s left', () => {
    let state = playing()
    for (let i = 0; i < 4; i++) state = playStage(state, 3, 0, T0 + i * 10_000, 4000)
    state = stage(state, 6, 0, T0 + 40_000, 4000)
    expect(state.outcome).toMatchObject({ remainingMs: 40_000, roundMs: ROUND })
    expect(state.phase).toBe('play') // the final's grade card first
    expect(titleFor(state.outcome!)).toBe('system-savior')
    state = gameReducer(state, { type: 'next', now: T0 + 50_000 })
    expect(state.phase).toBe('result')
  })

  it('the clock running out does not stop the round: every stage is still played', () => {
    let state = playing()
    for (let i = 0; i < 4; i++) state = playStage(state, 3, 0, T0 + i * 30_000, 15_000)
    expect(clockMs(state, T0 + 999_999)).toBe(0)
    state = stage(state, 6, 0, T0 + 200_000, 7000)
    expect(state.outcome!.remainingMs).toBe(-7000)
    expect(titleFor(state.outcome!)).toBe('almost-a-legend')
  })

  it('integrity is the share of right steps over the five stages', () => {
    let state = playing()
    state = playStage(state, 3, 0, T0)
    state = playStage(state, 0, 13, T0 + 10_000)
    state = playStage(state, 1, 1, T0 + 20_000)
    expect(integrity(state.stages)).toBe(30)
  })

  it('report notes keep the first four lines of a stage', () => {
    let state = gameReducer(playing(), { type: 'hold', now: T0, on: false })
    for (let i = 1; i <= 6; i++)
      state = gameReducer(state, { type: 'score', ok: 0, miss: 1, note: `n${i}` })
    expect(state.tally.notes).toEqual(['n1', 'n2', 'n3', 'n4'])
    expect(state.tally.miss).toBe(6)
  })

  it('result ⇄ report, then restart back to the button', () => {
    let state: GameState = playing()
    for (let i = 0; i < 5; i++) state = playStage(state, 2, 1, T0 + i * 10_000)
    state = gameReducer(state, { type: 'openReport' })
    expect(state.phase).toBe('report')
    state = gameReducer(state, { type: 'closeReport' })
    expect(state.phase).toBe('result')
    const round = state.round
    state = gameReducer(state, { type: 'restart' })
    expect(state).toEqual({ ...INITIAL_STATE, round })
  })
})
