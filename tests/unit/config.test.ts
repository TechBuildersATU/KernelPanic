import { describe, expect, it } from 'vitest'
import {
  COOLING_FAST_PENALTY_SECONDS,
  COOLING_SLOW_BONUS_SECONDS,
  DEFAULT_ROUND_SECONDS,
  EMERGENCY_CHOOSE_MS,
  EMERGENCY_READ_MS,
  ISIN,
  MAX_EVENTS_PER_ROUND,
  MIN_RANDOM_EVENTS,
  PIKSEL,
  RANDOM_EVENT_SLOTS,
  RENK,
  ROUND_SECONDS_OPTIONS,
  STAGE_COUNT,
  STAGE_ORDER,
} from '@/game/config'
import { parseTestFlags } from '@/app/testFlags'

describe('game config (docs/YOL-HARITASI.md)', () => {
  it('five stages in a fixed order, Basma Dedik last', () => {
    expect(STAGE_ORDER).toEqual(['piksel', 'renk', 'isin', 'tuzak', 'basma'])
    expect(STAGE_COUNT).toBe(5)
  })

  it('offers 45 / 60 / 75 s with 60 s as the default', () => {
    expect(ROUND_SECONDS_OPTIONS).toEqual([45, 60, 75])
    expect(DEFAULT_ROUND_SECONDS).toBe(60)
  })

  it('the cooling gives +5 s when time is short and takes −5 s when the player was too fast', () => {
    expect([COOLING_SLOW_BONUS_SECONDS, COOLING_FAST_PENALTY_SECONDS]).toEqual([5, 5])
  })

  it('never puts a random event on stage 1 or the final', () => {
    const slots = Object.keys(RANDOM_EVENT_SLOTS).map(Number)
    expect(slots).not.toContain(1)
    expect(slots).not.toContain(STAGE_COUNT)
    expect(MIN_RANDOM_EVENTS).toBeLessThanOrEqual(MAX_EVENTS_PER_ROUND)
  })

  it('Emergency is read first (no countdown), then counts down calmly', () => {
    expect(EMERGENCY_READ_MS).toBeGreaterThanOrEqual(3000)
    expect(EMERGENCY_READ_MS + EMERGENCY_CHOOSE_MS).toBeGreaterThanOrEqual(10_000)
  })

  it('Ölü Piksel has five screens on its three levels: two easy, two medium, one close look', () => {
    expect(PIKSEL.sizes).toEqual([4, 5, 6, 7, 8])
    expect(PIKSEL.levels).toEqual([0, 0, 1, 1, 2])
    expect(PIKSEL.diffs).toHaveLength(5)
    expect(PIKSEL.limitsMs).toHaveLength(5)
    // harder each time: more squares, a smaller difference, a little more time
    for (let i = 1; i < 5; i++) {
      expect(PIKSEL.diffs[i]).toBeLessThan(PIKSEL.diffs[i - 1])
      expect(PIKSEL.limitsMs[i]).toBeGreaterThan(PIKSEL.limitsMs[i - 1])
    }
  })

  it('every other stage has three steps of its own, each with its own clock', () => {
    for (const variant of ['normal', 'safe', 'risky'] as const) {
      expect(RENK.lengths[variant]).toHaveLength(3)
      expect(ISIN.lines[variant]).toHaveLength(3)
    }
    expect(ISIN.limitsMs).toHaveLength(3)
  })
})

describe('test flags', () => {
  it('parses seed, fast timers and a forced event', () => {
    expect(parseTestFlags('?seed=7&fastTimers=1&event=glitch')).toEqual({
      seed: 7,
      fastTimers: true,
      event: 'glitch',
      transition: undefined,
      mood: 'normal',
      half: false,
      intro: false,
    })
  })

  it('ignores unknown events and bad seeds', () => {
    expect(parseTestFlags('?seed=abc&event=nuke')).toEqual({
      seed: undefined,
      fastTimers: false,
      event: undefined,
      transition: undefined,
      mood: 'normal',
      half: false,
      intro: false,
    })
  })

  it('previews a transition inside one half of the duel with &half=1', () => {
    expect(parseTestFlags('?transition=error-404&half=1').half).toBe(true)
    expect(parseTestFlags('?transition=error-404').half).toBe(false)
  })

  it('knows the new titles for the transition preview', () => {
    expect(parseTestFlags('?transition=kernel-panic').transition).toBe('kernel-panic')
    expect(parseTestFlags('?transition=error-404').transition).toBe('error-404')
  })
})
