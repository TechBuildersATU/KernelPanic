import { seededRng, stageSeed, type Rng } from '../rng'
import type { Variant } from '../types'
import { makeOrders, type Order } from './basma'
import { makePixelScreens, type PixelScreen } from './piksel'
import { makeLayers, type ColourLayer } from './renk'
import { makeTrapItems, type TrapItem } from './tuzak'

// The duel (§2.5): both players get the same stages at the same difficulty, but not the same
// answers, so nobody can copy from the half next door — the dead pixel sits somewhere else, the
// colours light up in another order, the words and the commands come in another order. Işın Yolu
// stays the same for both (another line could be an easier one). Player 1 keeps the solo round's
// content; player 2's comes from seeds of its own, drawn again until it differs.

/** 0: a solo round; 1 and 2: the duel's players (left, right). */
export type Player = 0 | 1 | 2

/** The stages' seed salts (stageSeed): content, and the runners' own random parts. */
export const SALT = {
  piksel: 0,
  renk: 1,
  isin: 2,
  tuzak: 3,
  basma: 4,
  renkSwap: 11,
  isinGlitch: 12,
  tuzakButtons: 13,
} as const

/** Player 2's seeds lie this far from the shared ones (one more step per new draw). */
const OTHER = 100
/** Draws for player 2 before it keeps what it has (in practice the first or second differs). */
const TRIES = 30

/** The seed of a stage's random part for this player. */
export function playerSeed(seed: number, salt: number, player: Player, attempt = 0): number {
  return stageSeed(seed, player === 2 ? salt + OTHER * (attempt + 1) : salt)
}

/** Player 2's content is drawn again until `apart` says it differs enough from player 1's. */
function apartFrom<T>(
  seed: number,
  salt: number,
  player: Player,
  make: (rng: Rng) => T,
  apart: (mine: T, theirs: T) => boolean,
): T {
  const first = make(seededRng(stageSeed(seed, salt)))
  if (player !== 2) return first
  let other = first
  for (let attempt = 0; attempt < TRIES; attempt++) {
    other = make(seededRng(playerSeed(seed, salt, 2, attempt)))
    if (apart(other, first)) break
  }
  return other
}

/** A square at least two rows or columns away from `odd` on a size × size screen. */
export function elsewhere(size: number, odd: number, rng: Rng): number {
  const far = Array.from({ length: size * size }, (_, i) => i).filter(
    (i) =>
      Math.max(
        Math.abs((i % size) - (odd % size)),
        Math.abs(Math.floor(i / size) - Math.floor(odd / size)),
      ) >= 2,
  )
  return far[Math.floor(rng() * far.length)]
}

/**
 * ÖLÜ PİKSEL: the very same screens (size, colours, difference, clock); player 2's dead pixel
 * sits somewhere else, at least two squares away from player 1's.
 */
export function pixelScreensFor(seed: number, player: Player): PixelScreen[] {
  const screens = makePixelScreens(seededRng(stageSeed(seed, SALT.piksel)))
  if (player !== 2) return screens
  const rng = seededRng(playerSeed(seed, SALT.piksel, 2))
  return screens.map((screen) => ({ ...screen, odd: elsewhere(screen.size, screen.odd, rng) }))
}

/** DÖRT RENK: the same layers (lengths, speed, swaps); every layer lights up in another order. */
export function colourLayersFor(
  seed: number,
  variant: Variant,
  glitch: boolean,
  player: Player,
): ColourLayer[] {
  return apartFrom(
    seed,
    SALT.renk,
    player,
    (rng) => makeLayers(variant, glitch, rng),
    (mine, theirs) => mine.every((layer, i) => layer.seq.join() !== theirs[i].seq.join()),
  )
}

/** RENK TUZAĞI: the same two parts; no word comes in the same colour at the same place. */
export function trapItemsFor(seed: number, player: Player): TrapItem[] {
  return apartFrom(
    seed,
    SALT.tuzak,
    player,
    (rng) => makeTrapItems(rng),
    (mine, theirs) =>
      mine.every((item, i) => item.word !== theirs[i].word || item.ink !== theirs[i].ink),
  )
}

/** BASMA DEDİK: the same commands and TERS MOD last; they come in another order. */
export function ordersFor(seed: number, player: Player): Order[] {
  return apartFrom(
    seed,
    SALT.basma,
    player,
    (rng) => makeOrders(rng),
    (mine, theirs) =>
      mine[0].kind !== theirs[0].kind &&
      mine.map((o) => o.kind).join() !== theirs.map((o) => o.kind).join(),
  )
}
