import { COLOURS } from '../config'
import { shuffle, type Rng } from '../rng'
import type { Variant } from '../types'

// DÖRT RENK (stage 2): the pads light up in a sequence and the player repeats it. Three layers:
// easy, fast with a colour twice in a row, and one where the pads trade places after the show.
// Scored per colour: a wrong tap ends that layer, its colours still to come count as missed.

export const PADS = [
  { name: 'CAMGÖBEĞİ', color: '#44efec' },
  { name: 'YEŞİL', color: '#02ff18' },
  { name: 'SARI', color: '#ffb020' },
  { name: 'MAVİ', color: '#6f8cff' },
] as const

export interface ColourLayer {
  /** Pad ids (0–3) in the order they light up. */
  seq: number[]
  onMs: number
  /** The pads trade places after the show. */
  swap: boolean
}

/** A sequence without three of a kind in a row; the second layer gets one adjacent repeat. */
export function makeSequence(length: number, repeat: boolean, rng: Rng): number[] {
  const seq: number[] = []
  for (let i = 0; i < length; i++) {
    let k: number
    do {
      k = Math.floor(rng() * 4)
    } while (i > 1 && k === seq[i - 1] && k === seq[i - 2])
    seq.push(k)
  }
  if (repeat && length > 1) {
    let j: number
    do {
      j = 1 + Math.floor(rng() * (length - 1))
    } while (j >= 2 && seq[j - 2] === seq[j - 1])
    seq[j] = seq[j - 1]
    if (j + 1 < length && seq[j + 1] === seq[j])
      seq[j + 1] = (seq[j] + 1 + Math.floor(rng() * 3)) % 4
  }
  return seq
}

/** A new order in which no pad keeps its place. */
export function derange(order: readonly number[], rng: Rng): number[] {
  for (let t = 0; t < 50; t++) {
    const next = shuffle(order, rng)
    if (next.every((x, i) => x !== order[i])) return next
  }
  return [...order.slice(1), order[0]]
}

export function makeLayers(variant: Variant, glitch: boolean, rng: Rng): ColourLayer[] {
  return COLOURS.lengths[variant].map((length, i) => ({
    seq: makeSequence(length, i === 1, rng),
    onMs: COLOURS.onMs[variant][i],
    swap: COLOURS.swap[variant][i] || (glitch && i === 1),
  }))
}

/** All the colours of the stage (its step count). */
export function colourTotal(variant: Variant): number {
  return COLOURS.lengths[variant].reduce((sum, n) => sum + n, 0)
}
