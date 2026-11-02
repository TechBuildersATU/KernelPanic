import { describe, expect, it } from 'vitest'
import { TITLES } from '@/data/texts'
import { STAGE_ORDER } from '@/game/config'
import { gradeOf, isGreen } from '@/game/grades'
import { titleColour, titleFor, toneOf } from '@/game/titles'
import type { RoundOutcome, StageRecord, TitleId } from '@/game/types'
import { TITLE_IDS } from '@/app/testFlags'

const ROUND = 60_000

/** Five stages from their shares of right steps (out of 12 steps each). */
function outcome(shares: readonly number[], remainingMs = 20_000): RoundOutcome {
  const stages: StageRecord[] = shares.map((share, i) => ({
    slot: i + 1,
    stage: STAGE_ORDER[i],
    variant: 'normal',
    glitch: false,
    ok: Math.round(share * 12),
    miss: 12 - Math.round(share * 12),
    notes: [],
  }))
  return { stages, remainingMs, roundMs: ROUND }
}

describe('gradeOf (§5.1): the colour of a stage', () => {
  it.each([
    [3, 3, 'perfect'],
    [13, 13, 'perfect'],
    [12, 13, 'good'],
    [5, 6, 'good'],
    [4, 5, 'good'],
    [3, 4, 'pass'],
    [2, 3, 'pass'],
    [3, 6, 'pass'],
    [1, 2, 'pass'],
    [2, 5, 'fail'],
    [1, 3, 'fail'],
    [0, 3, 'fail'],
    [0, 0, 'fail'],
  ] as const)('%i of %i right → %s', (ok, total, grade) => {
    expect(gradeOf(ok, total)).toBe(grade)
  })

  it('exactly 75 % is still orange, more is lime', () => {
    expect(gradeOf(75, 100)).toBe('pass')
    expect(gradeOf(76, 100)).toBe('good')
    expect(gradeOf(50, 100)).toBe('pass')
    expect(gradeOf(49, 100)).toBe('fail')
  })

  it('green and lime count as "up"', () => {
    expect(['perfect', 'good', 'pass', 'fail'].map((g) => isGreen(g as never))).toEqual([
      true,
      true,
      false,
      false,
    ])
  })
})

describe('titleFor (§5.1)', () => {
  it.each<[string, RoundOutcome, TitleId]>([
    ['all perfect, ≥ 20 % left', outcome([1, 1, 1, 1, 1], 12_000), 'system-savior'],
    ['all perfect, < 20 % left', outcome([1, 1, 1, 1, 1], 11_999), 'last-second-hero'],
    ['all green, some lime', outcome([1, 0.84, 1, 1, 0.84]), 'all-systems-go'],
    ['four green, one orange', outcome([1, 1, 0.67, 1, 1]), 'one-bug-left'],
    ['four green, one red', outcome([1, 0.84, 0.25, 1, 1]), 'one-bug-left'],
    ['no red, two orange', outcome([1, 0.67, 0.67, 1, 1]), 'barely-booted'],
    ['all orange', outcome([0.67, 0.67, 0.67, 0.67, 0.67]), 'barely-booted'],
    ['one red, two orange', outcome([1, 0.25, 0.67, 0.67, 1]), 'safe-mode'],
    ['two red', outcome([0.25, 1, 0.25, 0.67, 1]), 'safe-mode'],
    ['three red', outcome([0.25, 0.25, 0.25, 1, 1]), 'error-404'],
    ['four red', outcome([0.25, 0.25, 0.25, 0.25, 1]), 'error-404'],
    ['all red', outcome([0.25, 0.25, 0, 0.25, 0.4]), 'kernel-panic'],
    ['out of time, three green', outcome([1, 1, 0.84, 0.25, 0.25], -3000), 'almost-a-legend'],
    ['out of time, all perfect', outcome([1, 1, 1, 1, 1], 0), 'almost-a-legend'],
    ['out of time, two green', outcome([1, 1, 0.67, 0.25, 0.25], -3000), 'turn-it-off-and-on'],
    ['out of time, all red', outcome([0, 0, 0, 0, 0], -9000), 'turn-it-off-and-on'],
  ])('%s → %s', (_name, input, expected) => {
    expect(titleFor(input)).toBe(expected)
  })

  it('scales the savior threshold with the round length (45 s / 75 s)', () => {
    const all = outcome([1, 1, 1, 1, 1])
    expect(titleFor({ ...all, remainingMs: 9_000, roundMs: 45_000 })).toBe('system-savior')
    expect(titleFor({ ...all, remainingMs: 14_999, roundMs: 75_000 })).toBe('last-second-hero')
  })

  it('every title has a text, a joke line, a tone and a colour', () => {
    for (const id of TITLE_IDS) {
      expect(TITLES[id].title.trim()).not.toBe('')
      expect(TITLES[id].line.trim()).not.toBe('')
      expect(['good', 'close', 'crash']).toContain(toneOf(id))
      expect(['perfect', 'good', 'pass', 'fail']).toContain(titleColour(id))
    }
    expect(Object.keys(TITLES).sort()).toEqual([...TITLE_IDS].sort())
  })
})
