import { describe, expect, it } from 'vitest'
import { clockMs, gameReducer } from '@/game/engine'
import { coolingShiftMs, moodOf, planEvents } from '@/game/events'
import { seededRng } from '@/game/rng'
import { NONE, playing, playStage, ROUND, stage, T0 } from './round'

describe('planEvents (§3)', () => {
  it('always plans 1–2 random events on stages 2–4, never twice the same kind', () => {
    const plans = Array.from({ length: 2000 }, (_, seed) => planEvents(seededRng(seed)))
    const slots = plans.map((plan) => [plan.glitch, plan.emergency].filter((s) => s !== null))
    expect(slots.filter((list) => list.length < 1 || list.length > 2)).toEqual([])
    expect(slots.flat().filter((slot) => ![2, 3, 4].includes(slot))).toEqual([])
    const doubles = plans.filter((plan) => plan.glitch !== null && plan.emergency !== null)
    expect(doubles.filter((plan) => plan.glitch === plan.emergency)).toEqual([])
    expect(doubles.length / plans.length).toBeGreaterThan(0.3)
    expect(doubles.length / plans.length).toBeLessThan(0.5)
  })

  it('the duel never gets an Emergency: its random event is one Glitch on stages 2–4', () => {
    const plans = Array.from({ length: 2000 }, (_, seed) =>
      planEvents(seededRng(seed), undefined, true),
    )
    expect(plans.filter((plan) => plan.emergency !== null)).toEqual([])
    expect(plans.filter((plan) => plan.glitch === null)).toEqual([])
    expect(plans.filter((plan) => ![2, 3, 4].includes(plan.glitch!))).toEqual([])
    // even when a test forces it
    expect(planEvents(seededRng(1), 'emergency', true)).toEqual(NONE)
    expect(planEvents(seededRng(1), 'glitch', true)).toEqual({ glitch: 2, emergency: null })
  })

  it('forced events plan exactly that event (tests)', () => {
    expect(planEvents(seededRng(1), 'glitch')).toEqual({ glitch: 2, emergency: null })
    expect(planEvents(seededRng(1), 'emergency')).toEqual({ glitch: null, emergency: 2 })
    expect(planEvents(seededRng(1), 'overheat-slow')).toEqual(NONE)
    expect(planEvents(seededRng(1), 'none')).toEqual(NONE)
  })

  it('cooling: slow → +5 s if held, nothing if touched; fast → nothing if held, −5 s if touched', () => {
    expect(coolingShiftMs('slow', true)).toBe(5000)
    expect(coolingShiftMs('slow', false)).toBe(0)
    expect(coolingShiftMs('fast', true)).toBe(0)
    expect(coolingShiftMs('fast', false)).toBe(-5000)
  })

  it('result mood follows the priority Overheat > Glitch > Emergency > Power', () => {
    expect(moodOf([])).toBe('normal')
    expect(moodOf(['power'])).toBe('power')
    expect(moodOf(['power', 'emergency'])).toBe('emergency')
    expect(moodOf(['emergency', 'glitch'])).toBe('glitch')
    expect(moodOf(['glitch', 'overheat', 'power'])).toBe('overheat')
  })
})

describe('SYSTEM OVERHEAT (§3.1)', () => {
  it('too fast: stages 1–2 with more than 80 % left → cooling before stage 3', () => {
    let state = playStage(playing(NONE, 'natural'), 3, 0, T0, 4000)
    state = stage(state, 13, 0, T0 + 10_000, 4000)
    expect(state.pendingOverheat).toBe('fast')
    state = gameReducer(state, { type: 'next', now: T0 + 20_000 })
    expect(state.overlay).toMatchObject({ kind: 'overheat', mode: 'fast', step: 'alarm' })
    expect(state.events).toContain('overheat')
    // the clock stands still through the alarm and the cooling
    expect(clockMs(state, T0 + 30_000)).toBe(ROUND - 8000)
    state = gameReducer(state, { type: 'overheatReady', now: T0 + 22_000 })
    expect(state.overlay).toMatchObject({ step: 'cooling' })
    // held still: no bonus for the fast one
    const held = gameReducer(state, { type: 'coolingDone', now: T0 + 25_000, ok: true })
    expect(held.overlay).toBeNull()
    expect(held.index).toBe(2)
    expect(held.cooling).toEqual({ mode: 'fast', ok: true })
    expect(clockMs(held, T0 + 40_000)).toBe(ROUND - 8000)
    expect(held.lastShift).toBeNull()
    // touched: the system heats up, −5 s
    const touched = gameReducer(state, { type: 'coolingDone', now: T0 + 25_000, ok: false })
    expect(touched.cooling).toEqual({ mode: 'fast', ok: false })
    expect(clockMs(touched, T0 + 40_000)).toBe(ROUND - 8000 - 5000)
    expect(touched.lastShift).toEqual({ deltaMs: -5000, at: T0 + 25_000 })
  })

  it('too slow: under 25 % left with ≥ 2 stages to go → +5 s if held, no penalty if touched', () => {
    let state = playStage(playing(NONE, 'natural'), 3, 0, T0, 30_000)
    state = stage(state, 13, 0, T0 + 40_000, 16_000)
    expect(state.pendingOverheat).toBe('slow')
    state = gameReducer(state, { type: 'next', now: T0 + 60_000 })
    state = gameReducer(state, { type: 'overheatReady', now: T0 + 62_000 })
    const touched = gameReducer(state, { type: 'coolingDone', now: T0 + 63_000, ok: false })
    expect(touched.cooling).toEqual({ mode: 'slow', ok: false })
    expect(clockMs(touched, T0 + 70_000)).toBe(ROUND - 46_000)
    expect(touched.lastShift).toBeNull()
    const held = gameReducer(state, { type: 'coolingDone', now: T0 + 63_000, ok: true })
    expect(clockMs(held, T0 + 70_000)).toBe(ROUND - 46_000 + 5000)
    expect(held.lastShift).toEqual({ deltaMs: 5000, at: T0 + 63_000 })
  })

  it('happens at most once and never right before the final', () => {
    let state = playing(NONE, 'overheat-slow')
    state = playStage(state, 3, 0, T0)
    expect(state.overlay?.kind).toBe('overheat')
    state = gameReducer(state, { type: 'overheatReady', now: T0 + 8000 })
    state = gameReducer(state, { type: 'coolingDone', now: T0 + 11_000, ok: true })
    state = playStage(state, 0, 13, T0 + 20_000, 40_000)
    expect(state.overlay).toBeNull()
    // natural rules: after stage 4 nothing can start, even with little time left
    let late = playing(NONE, 'natural')
    for (let i = 0; i < 3; i++) late = playStage(late, 3, 0, T0 + i * 20_000, 2000)
    late = stage(late, 6, 0, T0 + 70_000, 50_000)
    expect(late.pendingOverheat).toBeNull()
  })

  it('does not exceed two events when two random events are already planned', () => {
    let state = playing({ glitch: 3, emergency: 4 }, 'natural')
    state = playStage(state, 3, 0, T0, 2000)
    state = stage(state, 13, 0, T0 + 10_000, 2000)
    expect(state.pendingOverheat).toBeNull()
  })
})

describe('EMERGENCY MODE (§3.3)', () => {
  it('asks for a channel before stage 2, with the clock standing still', () => {
    let state = playStage(playing({ glitch: null, emergency: 2 }), 3, 0, T0)
    expect(state.overlay).toMatchObject({ kind: 'emergency' })
    expect(state.index).toBe(1)
    const before = clockMs(state, T0 + 8000)
    expect(clockMs(state, T0 + 12_000)).toBe(before)
    state = gameReducer(state, { type: 'chooseChannel', now: T0 + 9000, channel: 'safe' })
    expect(state).toMatchObject({ overlay: null, variant: 'safe' })
  })

  it('risky channel: +5 s if the stage ends green, −3 s if not', () => {
    let state = playStage(playing({ glitch: null, emergency: 2 }), 3, 0, T0)
    state = gameReducer(state, { type: 'chooseChannel', now: T0 + 9000, channel: 'risky' })
    const won = stage(state, 17, 1, T0 + 10_000)
    expect(won.lastShift?.deltaMs).toBe(5000)
    expect(won.stages[1]).toMatchObject({ variant: 'risky' })
    const lost = stage(state, 9, 9, T0 + 10_000)
    expect(lost.lastShift?.deltaMs).toBe(-3000)
  })

  it('safe channel: no time change', () => {
    let state = playStage(playing({ glitch: null, emergency: 2 }), 3, 0, T0)
    state = gameReducer(state, { type: 'chooseChannel', now: T0 + 9000, channel: 'safe' })
    expect(stage(state, 2, 9, T0 + 10_000).lastShift).toBeNull()
  })
})

describe('GLITCH DETECTED (§3.2)', () => {
  it('marks stage 2 as glitched in its record', () => {
    let state = playStage(playing({ glitch: 2, emergency: null }), 3, 0, T0)
    expect(state.events).toEqual(['glitch'])
    state = playStage(state, 13, 0, T0 + 10_000)
    expect(state.stages.map((r) => r.glitch)).toEqual([false, true])
  })
})

describe('POWER RESTORED (§3.4)', () => {
  it('fires once after two green stages in a row and changes nothing else', () => {
    let state = playStage(playing(), 3, 0, T0)
    expect(state.events).toEqual([])
    state = stage(state, 12, 1, T0 + 10_000)
    expect(state.events).toEqual(['power'])
    expect(state.powerAt).toBe(T0 + 15_000)
    state = gameReducer(state, { type: 'next', now: T0 + 17_000 })
    state = stage(state, 3, 0, T0 + 20_000)
    expect(state.events).toEqual(['power'])
  })

  it('an orange stage breaks the streak', () => {
    let state = playStage(playing(), 3, 0, T0)
    state = playStage(state, 8, 5, T0 + 10_000)
    state = stage(state, 3, 0, T0 + 20_000)
    expect(state.events).toEqual([])
  })
})
