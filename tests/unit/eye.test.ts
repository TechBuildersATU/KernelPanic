import { describe, expect, it } from 'vitest'
import {
  blinkAmount,
  BLINK_MS,
  CENTRE,
  lidPath,
  LOOKS,
  nextLook,
  towards,
} from '@/components/eye/geometry'
import { ATTRACT_NUDGE_MS, EYE_LOOK_MS, EYE_TOUCH_LOOK_MS } from '@/game/config'
import { seededRng } from '@/game/rng'

// The eye on the button screen (§2.1): where it looks and how its lids move.

describe('the eye', () => {
  it('looks somewhere else every 3 s; a touch holds its look a little shorter than that', () => {
    expect(EYE_LOOK_MS).toBe(3000)
    expect(EYE_TOUCH_LOOK_MS).toBeLessThan(EYE_LOOK_MS)
    expect(ATTRACT_NUDGE_MS).toBeGreaterThan(EYE_LOOK_MS * 3)
  })

  it('knows eight directions and straight ahead', () => {
    expect(LOOKS).toHaveLength(9)
    expect(LOOKS[CENTRE]).toMatchObject({ id: 'centre', x: 0, y: 0 })
    for (const look of LOOKS.slice(0, CENTRE))
      expect(Math.hypot(look.x, look.y)).toBeGreaterThan(0.99)
  })

  it('never looks the same way twice in a row, visits every direction and sometimes the visitor', () => {
    const rng = seededRng(11)
    const seen = new Set<number>()
    let look = CENTRE
    let centre = 0
    for (let i = 0; i < 2000; i++) {
      const next = nextLook(look, rng)
      expect(next).not.toBe(look)
      seen.add(next)
      if (next === CENTRE) centre++
      look = next
    }
    expect(seen.size).toBe(LOOKS.length)
    expect(centre / 2000).toBeGreaterThan(0.05)
    expect(centre / 2000).toBeLessThan(0.2)
  })

  it('looks towards a touch: all the way for far points, less for points close by', () => {
    const far = towards(0, 368, 640, 368, 230)
    expect(far.x).toBeCloseTo(-1)
    expect(far.y).toBeCloseTo(0)
    const near = towards(740, 368, 640, 368, 230)
    expect(near.x).toBeCloseTo(100 / 230)
    const diagonal = towards(1280, 0, 640, 368, 230)
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1)
    expect(diagonal.x).toBeGreaterThan(0)
    expect(diagonal.y).toBeLessThan(0)
  })

  it('closes its lids across the middle and opens them wide when pressed', () => {
    const mid = (path: string) => Number(/Q240 ([-\d.]+)/.exec(path)?.[1])
    const side = (path: string) => Number(/V([-\d.]+)/.exec(path)?.[1])
    // the edge's control point: the curve's middle is halfway between it and the sides
    const middle = (path: string) => (mid(path) + side(path)) / 2
    expect(middle(lidPath('top', 0))).toBeCloseTo(104)
    expect(middle(lidPath('bottom', 0))).toBeCloseTo(384)
    expect(middle(lidPath('top', 1))).toBeGreaterThan(middle(lidPath('bottom', 1)))
    expect(middle(lidPath('top', -0.3))).toBeLessThan(104)
    expect(middle(lidPath('bottom', -0.3))).toBeGreaterThan(384)
  })

  it('blinks quickly: shut within 70 ms, open again after a quarter of a second', () => {
    expect(blinkAmount(-1)).toBe(0)
    expect(blinkAmount(35)).toBeGreaterThan(0)
    expect(blinkAmount(35)).toBeLessThan(1)
    expect(blinkAmount(90)).toBe(1)
    expect(blinkAmount(200)).toBeLessThan(0.1)
    expect(blinkAmount(BLINK_MS)).toBe(0)
    expect(BLINK_MS).toBeLessThan(300)
  })
})
