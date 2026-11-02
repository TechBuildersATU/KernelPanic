// The eye on the button screen (§2.1): where it looks and how its lids move. Pure numbers; the
// drawing lives in Eye.tsx and the motion in motion.ts. Units are the eye's 480 × 480 viewBox.

const D = 0.74

/** Where the eye looks: eight directions and straight at the visitor (x right, y down). */
export const LOOKS = [
  { id: 'right', x: 1, y: 0 },
  { id: 'left', x: -1, y: 0 },
  { id: 'up', x: 0, y: -1 },
  { id: 'down', x: 0, y: 1 },
  { id: 'up-right', x: D, y: -D },
  { id: 'up-left', x: -D, y: -D },
  { id: 'down-right', x: D, y: D },
  { id: 'down-left', x: -D, y: D },
  { id: 'centre', x: 0, y: 0 },
] as const

export type LookId = (typeof LOOKS)[number]['id']

/** Index of "straight at the visitor" in LOOKS. */
export const CENTRE = LOOKS.length - 1

/** The next place to look: never the same one twice in a row; now and then straight ahead. */
export function nextLook(prev: number, rng: () => number, centreChance = 0.12): number {
  for (;;) {
    const i = rng() < centreChance ? CENTRE : Math.floor(rng() * CENTRE)
    if (i !== prev) return i
  }
}

/**
 * The gaze from the eye's centre towards a point: a unit vector for points at least `reach` away,
 * shorter for points close to the eye (it only glances at what is right next to it).
 */
export function towards(
  px: number,
  py: number,
  cx: number,
  cy: number,
  reach: number,
): { x: number; y: number } {
  const dx = px - cx
  const dy = py - cy
  const k = 1 / Math.max(Math.hypot(dx, dy), reach)
  return { x: dx * k, y: dy * k }
}

/** How far the iris travels for a gaze of 1, sideways and up/down. */
export const TRAVEL = { x: 60, y: 50 } as const

/**
 * The lids' edges: [middle at rest, sides at rest, middle closed, sides closed]. At rest the top
 * lid shows as a thin metal lip over the lens; closed, both meet just across the middle.
 */
export const LIDS = {
  top: [104, 242, 244, 244],
  bottom: [384, 238, 236, 236],
} as const

const f = (n: number) => n.toFixed(1)

/**
 * A lid at `closed` (0 open, 1 shut; below 0 it pulls back further, the eye opens wide): its edge
 * is a curve through the sides and the middle, the lid fills everything above (top) or below it.
 */
export function lidPath(edge: 'top' | 'bottom', closed: number): string {
  const [midOpen, sideOpen, midShut, sideShut] = LIDS[edge]
  const mid = midOpen + (midShut - midOpen) * closed
  const side = sideOpen + (sideShut - sideOpen) * closed
  const control = 2 * mid - side
  const far = edge === 'top' ? -80 : 560
  return `M0 ${far} H480 V${f(side)} Q240 ${f(control)} 0 ${f(side)}Z`
}

/** A blink takes this long: shut in 70 ms, held 40 ms, open again in 150 ms. */
export const BLINK_MS = 260

/** How shut the lids are `t` ms into a blink (0 open, 1 shut). */
export function blinkAmount(t: number): number {
  if (t < 0 || t >= BLINK_MS) return 0
  if (t < 70) return (t / 70) ** 2
  if (t < 110) return 1
  return (1 - (t - 110) / 150) ** 3
}
