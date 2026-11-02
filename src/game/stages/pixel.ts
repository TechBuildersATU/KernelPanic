import { PIXEL } from '../config'
import { shuffle, type Rng } from '../rng'

// ÖLÜ PİKSEL (stage 1): one square on the screen is a shade off. Five screens, each harder and
// each with its own clock; the last one also drifts its hue a little. Every screen of a round is
// painted in another colour from a palette of eighteen tones, each nudged a little every round
// (Faz 10), so the screens rarely look the same twice.

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

/** The screens' levels (PIXEL.levels). */
export const PIXEL_TAGS = ['kolay', 'orta', 'dikkatli bak'] as const

/**
 * The palette: [hue, saturation %, lightness %]. The lightness is tuned per hue so every colour
 * looks about as bright (yellows and greens are darker, blues and violets lighter) and the dead
 * pixel's difference stays as hard to see on each of them.
 */
export const PIXEL_COLOURS: readonly (readonly [number, number, number])[] = [
  [356, 78, 56], // red
  [12, 84, 57], // coral
  [28, 88, 52], // orange
  [42, 90, 48], // amber
  [54, 82, 45], // gold
  [84, 66, 44], // lime
  [128, 64, 44], // green
  [152, 70, 42], // emerald
  [172, 74, 41], // teal
  [186, 82, 46], // cyan
  [202, 84, 52], // sky
  [218, 80, 58], // blue
  [236, 70, 63], // indigo
  [258, 72, 61], // violet
  [280, 62, 57], // purple
  [302, 64, 55], // magenta
  [326, 80, 58], // pink
  [342, 72, 60], // rose
]

/** Hues of two screens in a row are at least this far apart (degrees on the colour wheel). */
const MIN_HUE_STEP = 40

const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360
  return Math.min(d, 360 - d)
}

/** Five colours for a round: all different, no two neighbours alike, each nudged a little. */
function pickColours(rng: Rng): [number, number, number][] {
  let picked = shuffle(PIXEL_COLOURS, rng).slice(0, PIXEL.sizes.length)
  for (let tries = 0; tries < 50; tries++) {
    if (picked.every((c, i) => i === 0 || hueGap(c[0], picked[i - 1][0]) >= MIN_HUE_STEP)) break
    picked = shuffle(PIXEL_COLOURS, rng).slice(0, PIXEL.sizes.length)
  }
  return picked.map(([h, s, l]) => [
    (h + Math.round((rng() - 0.5) * 12) + 360) % 360,
    s + Math.round((rng() - 0.5) * 10),
    l,
  ])
}

export function makePixelScreens(rng: Rng): PixelScreen[] {
  const colours = pickColours(rng)
  return PIXEL.sizes.map((size, i) => {
    const [hue, sat, light] = colours[i]
    const sign = rng() < 0.5 ? 1 : -1
    const diff = PIXEL.diffs[i]
    const last = i === PIXEL.sizes.length - 1
    return {
      size,
      odd: Math.floor(rng() * size * size),
      base: `hsl(${hue} ${sat}% ${light}%)`,
      dead: `hsl(${last ? hue + 3 : hue} ${sat}% ${light + sign * diff}%)`,
      diff,
      limitMs: PIXEL.limitsMs[i],
    }
  })
}
