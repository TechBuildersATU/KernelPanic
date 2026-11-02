import { PIXEL } from '../config'
import { shuffle, type Rng } from '../rng'

// ÖLÜ PİKSEL (stage 1): one square on the screen is a shade off. Five screens, each harder and
// each with its own clock; the last one also drifts its hue a little. For variety (Faz 10) every
// screen of a round is another kind of panel — its pixels drawn as squares, LEDs, diamonds,
// honeycomb cells or RGB bars — in another colour from a pool of eight. The difficulty stays:
// the same sizes, differences and clocks; the diamonds, the smallest pixels, only come on the
// first three screens.

/** How a screen's pixels are drawn. */
export type PixelLook = 'square' | 'led' | 'diamond' | 'hex' | 'bars'

export const PIXEL_LOOKS: readonly PixelLook[] = ['square', 'led', 'diamond', 'hex', 'bars']

/** The panel's name next to the screen (on-screen text). */
export const LOOK_NAMES: Readonly<Record<PixelLook, string>> = {
  square: 'LCD',
  led: 'LED',
  diamond: 'elmas',
  hex: 'petek',
  bars: 'RGB',
}

/** Hues the screens are painted in (each one at most once a round). */
export const PIXEL_HUES: readonly number[] = [186, 132, 34, 226, 262, 205, 95, 330]

export interface PixelScreen {
  /** Squares per side. */
  size: number
  look: PixelLook
  /** Index of the dead pixel (row-major). */
  odd: number
  base: string
  dead: string
  /** Lightness difference, in %. */
  diff: number
  limitMs: number
}

/** The screens' levels (PIXEL.levels). */
export const PIXEL_TAGS = ['kolay', 'orta', 'dikkatli bak'] as const

export function makePixelScreens(rng: Rng): PixelScreen[] {
  const hues = shuffle(PIXEL_HUES, rng)
  let looks: PixelLook[]
  do {
    looks = shuffle(PIXEL_LOOKS, rng)
  } while (looks.indexOf('diamond') > 2)
  return PIXEL.sizes.map((size, i) => {
    const hue = hues[i]
    const light = hue === 226 || hue === 262 ? 58 : hue === 34 ? 52 : 48
    const sign = rng() < 0.5 ? 1 : -1
    const diff = PIXEL.diffs[i]
    const last = i === PIXEL.sizes.length - 1
    return {
      size,
      look: looks[i],
      odd: Math.floor(rng() * size * size),
      base: `hsl(${hue} 82% ${light}%)`,
      dead: `hsl(${last ? hue + 3 : hue} 82% ${light + sign * diff}%)`,
      diff,
      limitMs: PIXEL.limitsMs[i],
    }
  })
}
