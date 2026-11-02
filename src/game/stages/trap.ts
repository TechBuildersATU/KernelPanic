import { TRAP } from '../config'
import type { Rng } from '../rng'

// RENK TUZAĞI (stage 4): a colour name painted in another colour (MAVİ in red). Two parts: first
// tap the colour the word SAYS, then — after the "rule changed" warning — the colour it is
// PAINTED in. Reading comes first on purpose: the eye has just learned to read, and now it must
// not (the Stroop effect).

export const INKS = [
  { name: 'KIRMIZI', color: '#ff2d4a' },
  { name: 'YEŞİL', color: '#19e04a' },
  { name: 'SARI', color: '#ffd60a' },
  { name: 'MAVİ', color: '#4d7dff' },
] as const

export const TRAP_RULES = ['YAZISINA BAS', 'RENGİNE BAS'] as const

export interface TrapItem {
  /** 0: tap what the word says, 1: tap the ink colour. */
  part: 0 | 1
  /** Colour the word names (INKS index). */
  word: number
  /** Colour the word is painted in. */
  ink: number
  /** The right button. */
  answer: number
}

export function makeTrapItems(rng: Rng): TrapItem[] {
  const items: TrapItem[] = []
  for (let n = 0; n < TRAP.perPart * 2; n++) {
    const part = n < TRAP.perPart ? 0 : 1
    const prev = items.at(-1)
    let word: number
    let ink: number
    do {
      word = Math.floor(rng() * 4)
      // the very first word may match its colour (a warm-up); after that they always lie
      if (n === 0 && rng() < 0.5) ink = word
      else
        do {
          ink = Math.floor(rng() * 4)
        } while (ink === word)
    } while (prev && prev.word === word && prev.ink === ink)
    items.push({ part, word, ink, answer: part === 0 ? word : ink })
  }
  return items
}
