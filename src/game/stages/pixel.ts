import { PIXEL } from '../config'
import { pickOne, shuffle, type Rng } from '../rng'

// ÖLÜ PİKSEL (stage 1): one square on the screen is a shade off. Five screens, each harder and
// each with its own clock; the last one also drifts its hue a little.

export interface PixelScreen {
  /** Squares per side. */
  size: number
  /** Index of the dead pixel (row-major). */
  odd: number
  base: string
  dead: string
  /** Lightness difference, in %. */
  diff: number
  limitMs: number
}

/** The screens' levels (PIKSEL.levels). */
export const PIXEL_TAGS = ['kolay', 'orta', 'dikkatli bak'] as const

export function makePixelScreens(rng: Rng): PixelScreen[] {
  const hues = [...shuffle([186, 132, 34, 226], rng), pickOne([262, 205, 95, 330], rng)]
  return PIXEL.sizes.map((size, i) => {
    const hue = hues[i]
    const light = hue === 226 || hue === 262 ? 58 : hue === 34 ? 52 : 48
    const sign = rng() < 0.5 ? 1 : -1
    const diff = PIXEL.diffs[i]
    const last = i === PIXEL.sizes.length - 1
    return {
      size,
      odd: Math.floor(rng() * size * size),
      base: `hsl(${hue} 82% ${light}%)`,
      dead: `hsl(${last ? hue + 3 : hue} 82% ${light + sign * diff}%)`,
      diff,
      limitMs: PIXEL.limitsMs[i],
    }
  })
}
