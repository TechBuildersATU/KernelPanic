import { describe, expect, it } from 'vitest'
import { BEAM } from '@/game/config'
import { seededRng } from '@/game/rng'
import { effectiveCommand, makeOrders, ringColourAt, windowOf } from '@/game/stages/orders'
import {
  makeBeamLine,
  makeBeamLines,
  mirrorLine,
  solutionOf,
  sourceDir,
  traceBeam,
} from '@/game/stages/beam'
import { makePixelScreens, PIXEL_COLOURS } from '@/game/stages/pixel'
import { colourTotal, derange, makeLayers, makeSequence } from '@/game/stages/colours'
import { makeTrapItems } from '@/game/stages/trap'

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

  it('many colours and tones: eighteen colours, nudged every round, no two neighbours alike', () => {
    const hue = (css: string) => Number(/hsl\((\d+)/.exec(css)?.[1])
    const near = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b))
    const families = new Set<number>()
    const tones = new Set<string>()
    const steps: number[] = []
    for (const seed of SEEDS) {
      const screens = makePixelScreens(seededRng(seed))
      screens.forEach((s) => {
        tones.add(s.base)
        // the palette colour it came from: the closest hue
        const from = PIXEL_COLOURS.reduce(
          (best, c, k) =>
            near(c[0], hue(s.base)) < near(PIXEL_COLOURS[best][0], hue(s.base)) ? k : best,
          0,
        )
        families.add(from)
      })
      for (let i = 1; i < screens.length; i++)
        steps.push(near(hue(screens[i].base), hue(screens[i - 1].base)))
    }
    // two screens in a row never look alike
    expect(Math.min(...steps)).toBeGreaterThanOrEqual(28)
    // every colour of the palette shows up, in many more tones than colours
    expect(families.size).toBe(PIXEL_COLOURS.length)
    expect(tones.size).toBeGreaterThan(PIXEL_COLOURS.length * 5)
  })
})

describe('Dört Renk', () => {
  it('layers 3–5–5; the second has a colour twice in a row', () => {
    for (const seed of SEEDS) {
      const layers = makeLayers(false, seededRng(seed))
      expect(layers.map((l) => l.seq.length)).toEqual([3, 5, 5])
      expect(layers.map((l) => l.swap)).toEqual([false, false, true])
      const second = layers[1].seq
      expect(second.some((k, i) => i > 0 && k === second[i - 1])).toBe(true)
      for (const { seq } of layers) {
        expect(seq.every((k) => k >= 0 && k < 4)).toBe(true)
        expect(seq.some((k, i) => i > 1 && k === seq[i - 1] && k === seq[i - 2])).toBe(false)
      }
    }
    expect(colourTotal()).toBe(13)
  })

  it('glitch makes the second layer swap too', () => {
    expect(makeLayers(true, seededRng(2)).map((l) => l.swap)).toEqual([false, true, true])
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
  it('every recipe makes lines that are unsolved at the start and solved by their solution', () => {
    for (const recipes of BEAM.lines) {
      for (const size of recipes) {
        for (const seed of SEEDS) {
          const line = makeBeamLine(size, seededRng(seed))
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

  it('a mirrored line is still solvable and still starts unsolved', () => {
    for (const seed of SEEDS) {
      const line = makeBeamLine(BEAM.lines[1][seed % 3], seededRng(seed))
      for (const [across, upside] of [
        [true, false],
        [false, true],
        [true, true],
      ]) {
        const seen = mirrorLine(line, across, upside)
        expect(traceBeam(seen, seen.start).ok).toBe(false)
        expect(traceBeam(seen, solutionOf(seen, seen.start)).ok).toBe(true)
        expect(sourceDir(seen)).toBe(across ? -1 : 1)
      }
    }
  })

  it('the three lines vary: either side for the emitter, every recipe, the server anywhere', () => {
    const sides = new Set<number>()
    const shapes = new Set<string>()
    const servers = new Set<string>()
    for (const seed of SEEDS) {
      const lines = makeBeamLines(seededRng(seed))
      expect(lines.map((l) => [l.cols, l.rows])).toEqual([
        [6, 4],
        [7, 5],
        [8, 5],
      ])
      for (const [i, line] of lines.entries()) {
        expect(traceBeam(line, line.start).ok).toBe(false)
        expect(traceBeam(line, solutionOf(line, line.start)).ok).toBe(true)
        sides.add(sourceDir(line))
        const fixed = line.mirrors.filter((m) => m.solution !== null).length
        shapes.add(`${i}:${fixed}:${line.walls.length}`)
        servers.add(
          line.server.x === -1
            ? 'left'
            : line.server.x === line.cols
              ? 'right'
              : line.server.y < 0
                ? 'top'
                : 'bottom',
        )
      }
    }
    expect([...sides].sort()).toEqual([-1, 1])
    expect([...servers].sort()).toEqual(['bottom', 'left', 'right', 'top'])
    // every line comes in several shapes (its recipes)
    for (const i of [0, 1, 2])
      expect([...shapes].filter((s) => s.startsWith(`${i}:`)).length).toBeGreaterThanOrEqual(3)
  })

  it('the beam stops at a wall and ends outside the grid at the server when solved', () => {
    const line = makeBeamLine(BEAM.lines[1][0], seededRng(9))
    const beam = traceBeam(line, solutionOf(line, line.start))
    expect(beam.points[0]).toEqual([line.source.x, line.source.y])
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
      expect(four.map((o) => o.kind).sort()).toEqual(['dontPress', 'green', 'hold', 'triple'])
      expect(four[0].kind).not.toBe('dontPress')
      expect(four.every((o) => !o.inverted)).toBe(true)
      const reverse = orders.slice(4)
      expect(reverse.map((o) => o.kind).sort()).toEqual(['dontPress', 'press'])
      expect(reverse.every((o) => o.inverted && o.step === 4)).toBe(true)
    }
  })

  it('TERS MOD turns BAS into "do not press" and BASMA! into "press"', () => {
    expect(effectiveCommand({ kind: 'press', inverted: true, step: 4 })).toBe('dontPress')
    expect(effectiveCommand({ kind: 'dontPress', inverted: true, step: 4 })).toBe('press')
    expect(effectiveCommand({ kind: 'triple', inverted: false, step: 0 })).toBe('triple')
    expect(windowOf({ kind: 'dontPress', inverted: false, step: 1 })).toBe(2000)
    expect(windowOf({ kind: 'press', inverted: true, step: 4 })).toBe(2000)
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
