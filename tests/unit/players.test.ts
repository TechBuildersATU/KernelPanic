import { describe, expect, it } from 'vitest'
import { PIXEL } from '@/game/config'
import { seededRng, stageSeed } from '@/game/rng'
import { effectiveCommand, makeOrders } from '@/game/stages/orders'
import { makePixelScreens } from '@/game/stages/pixel'
import {
  colourLayersFor,
  elsewhere,
  ordersFor,
  pixelScreensFor,
  SALT,
  trapItemsFor,
} from '@/game/stages/players'
import { makeLayers } from '@/game/stages/colours'
import { makeTrapItems } from '@/game/stages/trap'

// The duel (§2.5): the same stages at the same difficulty, but other answers for player 2.

const SEEDS = Array.from({ length: 300 }, (_, i) => (i * 2654435761) >>> 0)
const far = (size: number, a: number, b: number) =>
  Math.max(Math.abs((a % size) - (b % size)), Math.abs(Math.floor(a / size) - Math.floor(b / size)))

describe('duel content per player (§2.5)', () => {
  it('a solo round and player 1 get exactly the solo content', () => {
    const seed = 12345
    expect(pixelScreensFor(seed, 1)).toEqual(makePixelScreens(seededRng(stageSeed(seed, 0))))
    expect(pixelScreensFor(seed, 0)).toEqual(pixelScreensFor(seed, 1))
    expect(colourLayersFor(seed, 'normal', false, 1)).toEqual(
      makeLayers('normal', false, seededRng(stageSeed(seed, SALT.colours))),
    )
    expect(trapItemsFor(seed, 1)).toEqual(makeTrapItems(seededRng(stageSeed(seed, SALT.trap))))
    expect(ordersFor(seed, 1)).toEqual(makeOrders(seededRng(stageSeed(seed, SALT.orders))))
  })

  it('Ölü Piksel: the same five screens, the dead pixel two squares or more away', () => {
    for (const seed of SEEDS) {
      const one = pixelScreensFor(seed, 1)
      const two = pixelScreensFor(seed, 2)
      expect(two).toHaveLength(PIXEL.sizes.length)
      two.forEach((screen, i) => {
        const { odd: a, ...same } = one[i]
        const { odd: b, ...mine } = screen
        expect(mine).toEqual(same)
        expect(b).toBeGreaterThanOrEqual(0)
        expect(b).toBeLessThan(screen.size * screen.size)
        expect(far(screen.size, a, b)).toBeGreaterThanOrEqual(2)
      })
    }
  })

  it('elsewhere() finds a far square from every square of the smallest screen', () => {
    for (let odd = 0; odd < 16; odd++) {
      for (let r = 0; r < 20; r++) {
        expect(far(4, odd, elsewhere(4, odd, seededRng(r)))).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('Dört Renk: same lengths, speed and swaps; every layer lights up in another order', () => {
    for (const variant of ['normal', 'safe', 'risky'] as const) {
      for (const seed of SEEDS) {
        const one = colourLayersFor(seed, variant, seed % 2 === 0, 1)
        const two = colourLayersFor(seed, variant, seed % 2 === 0, 2)
        expect(two.map((l) => [l.seq.length, l.onMs, l.swap])).toEqual(
          one.map((l) => [l.seq.length, l.onMs, l.swap]),
        )
        two.forEach((layer, i) => expect(layer.seq.join()).not.toBe(one[i].seq.join()))
      }
    }
  })

  it('Renk Tuzağı: the same two parts; no word comes in the same colour at the same place', () => {
    for (const seed of SEEDS) {
      const one = trapItemsFor(seed, 1)
      const two = trapItemsFor(seed, 2)
      expect(two.map((item) => item.part)).toEqual(one.map((item) => item.part))
      two.forEach((item, i) => {
        expect(item.word !== one[i].word || item.ink !== one[i].ink).toBe(true)
        expect(item.answer).toBe(item.part === 0 ? item.word : item.ink)
      })
    }
  })

  it('Basma Dedik: the same commands, TERS MOD last, in another order from the first one on', () => {
    for (const seed of SEEDS) {
      const one = ordersFor(seed, 1)
      const two = ordersFor(seed, 2)
      const kinds = (orders: typeof one) => orders.map((o) => o.kind)
      expect([...kinds(two)].sort()).toEqual([...kinds(one)].sort())
      expect(two.slice(4).every((o) => o.inverted && o.step === 4)).toBe(true)
      expect(two[0].kind).not.toBe(one[0].kind)
      expect(two[0].kind).not.toBe('dontPress')
      expect(two.map(effectiveCommand)).toHaveLength(6)
    }
  })
})
