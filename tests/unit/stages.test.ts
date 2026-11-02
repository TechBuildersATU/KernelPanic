import { describe, expect, it } from 'vitest'
import { ISIN } from '@/game/config'
import { seededRng } from '@/game/rng'
import { effectiveCommand, makeOrders, ringColourAt, windowOf } from '@/game/stages/basma'
import { makeBeamLine, solutionOf, traceBeam } from '@/game/stages/isin'
import { makePixelScreens } from '@/game/stages/piksel'
import { colourTotal, derange, makeLayers, makeSequence } from '@/game/stages/renk'
import { makeTrapItems } from '@/game/stages/tuzak'

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1)

describe('Ölü Piksel', () => {
  it('five screens, 4×4 → 8×8, the dead pixel inside, getting subtler, each in its own colour', () => {
    for (const seed of SEEDS) {
      const screens = makePixelScreens(seededRng(seed))
      expect(screens.map((s) => s.size)).toEqual([4, 5, 6, 7, 8])
      expect(screens.map((s) => s.diff)).toEqual([10, 8, 6, 5, 3.5])
      expect(new Set(screens.map((s) => s.base)).size).toBe(5)
      for (const s of screens) {
        expect(s.odd).toBeGreaterThanOrEqual(0)
        expect(s.odd).toBeLessThan(s.size * s.size)
        expect(s.dead).not.toBe(s.base)
      }
    }
  })

  it('the same seed gives the same screens', () => {
    expect(makePixelScreens(seededRng(5))).toEqual(makePixelScreens(seededRng(5)))
  })
})

describe('Dört Renk', () => {
  it('layers 3–5–5 (safe 3–4–4, risky 5–6–7); the second has a colour twice in a row', () => {
    for (const seed of SEEDS) {
      const layers = makeLayers('normal', false, seededRng(seed))
      expect(layers.map((l) => l.seq.length)).toEqual([3, 5, 5])
      expect(layers.map((l) => l.swap)).toEqual([false, false, true])
      const second = layers[1].seq
      expect(second.some((k, i) => i > 0 && k === second[i - 1])).toBe(true)
      for (const { seq } of layers) {
        expect(seq.every((k) => k >= 0 && k < 4)).toBe(true)
        expect(seq.some((k, i) => i > 1 && k === seq[i - 1] && k === seq[i - 2])).toBe(false)
      }
    }
    expect(makeLayers('safe', false, seededRng(1)).map((l) => l.seq.length)).toEqual([3, 4, 4])
    expect(makeLayers('risky', false, seededRng(1)).map((l) => l.seq.length)).toEqual([5, 6, 7])
    expect([colourTotal('normal'), colourTotal('safe'), colourTotal('risky')]).toEqual([13, 11, 18])
  })

  it('glitch makes the second layer swap too', () => {
    expect(makeLayers('normal', true, seededRng(2)).map((l) => l.swap)).toEqual([false, true, true])
  })

  it('a swap moves every pad', () => {
    for (const seed of SEEDS) {
      const next = derange([0, 1, 2, 3], seededRng(seed))
      expect([...next].sort()).toEqual([0, 1, 2, 3])
      expect(next.every((p, i) => p !== i)).toBe(true)
    }
  })

  it('sequences of one colour are fine', () => {
    expect(makeSequence(1, true, seededRng(3))).toHaveLength(1)
  })
})

describe('Işın Yolu', () => {
  it('every generated line is unsolved at the start and solved by its solution', () => {
    for (const variant of ['normal', 'safe', 'risky'] as const) {
      for (const seed of SEEDS) {
        const rng = seededRng(seed)
        for (const size of ISIN.lines[variant]) {
          const line = makeBeamLine(size, rng)
          expect(traceBeam(line, line.start).ok).toBe(false)
          expect(traceBeam(line, solutionOf(line, line.start)).ok).toBe(true)
          const [cols, rows, , decoys, walls] = size
          expect(line.cols).toBe(cols)
          expect(line.rows).toBe(rows)
          expect(line.walls).toHaveLength(walls)
          expect(line.mirrors.filter((m) => m.solution === null)).toHaveLength(decoys)
        }
      }
    }
  })

  it('the beam stops at a wall and ends outside the grid at the server when solved', () => {
    const line = makeBeamLine(ISIN.lines.normal[1], seededRng(9))
    const beam = traceBeam(line, solutionOf(line, line.start))
    expect(beam.points[0]).toEqual([-1, line.entry])
    expect(beam.points.at(-1)).toEqual([line.server.x, line.server.y])
  })
})

describe('Renk Tuzağı', () => {
  it('first three: tap what the word says; last three: tap its colour; words mostly lie', () => {
    for (const seed of SEEDS) {
      const items = makeTrapItems(seededRng(seed))
      expect(items.map((i) => i.part)).toEqual([0, 0, 0, 1, 1, 1])
      for (const item of items) {
        expect(item.answer).toBe(item.part === 0 ? item.word : item.ink)
      }
      expect(items.slice(1).every((i) => i.word !== i.ink)).toBe(true)
      expect(
        items.every(
          (i, n) => n === 0 || i.word !== items[n - 1].word || i.ink !== items[n - 1].ink,
        ),
      ).toBe(true)
    }
  })
})

describe('Basma Dedik', () => {
  it('four different commands, never BASMA! first, then TERS MOD with BAS and BASMA!', () => {
    for (const seed of SEEDS) {
      const orders = makeOrders(seededRng(seed))
      expect(orders).toHaveLength(6)
      const four = orders.slice(0, 4)
      expect(four.map((o) => o.kind).sort()).toEqual(['basma', 'tut', 'uc', 'yesil'])
      expect(four[0].kind).not.toBe('basma')
      expect(four.every((o) => !o.inverted)).toBe(true)
      const ters = orders.slice(4)
      expect(ters.map((o) => o.kind).sort()).toEqual(['bas', 'basma'])
      expect(ters.every((o) => o.inverted && o.step === 4)).toBe(true)
    }
  })

  it('TERS MOD turns BAS into "do not press" and BASMA! into "press"', () => {
    expect(effectiveCommand({ kind: 'bas', inverted: true, step: 4 })).toBe('basma')
    expect(effectiveCommand({ kind: 'basma', inverted: true, step: 4 })).toBe('bas')
    expect(effectiveCommand({ kind: 'uc', inverted: false, step: 0 })).toBe('uc')
    expect(windowOf({ kind: 'basma', inverted: false, step: 1 })).toBe(2000)
    expect(windowOf({ kind: 'bas', inverted: true, step: 4 })).toBe(2000)
  })

  it('YEŞİLDE BAS: red, then amber, then green, every 1.5 s', () => {
    expect([0, 699, 700, 999, 1000, 1499, 1500].map(ringColourAt)).toEqual([
      'r',
      'r',
      'a',
      'a',
      'g',
      'g',
      'r',
    ])
  })
})
