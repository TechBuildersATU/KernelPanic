import { useId, type ReactNode } from 'react'
import s from './LogoChip.module.css'

// The club's banner puts its logo in a glowing ring with circuit traces running out of it like the
// pins of a chip; the game frames its logo the same way. The frame is drawn around the artwork —
// the logo itself is never recoloured or redrawn.

/** The frame's drawing area, in logo radii (the logo is 2 wide): traces reach out to here. */
const EXTENT = 2.6
/** Radius (viewBox units, logo = 100) where the traces leave the ring. */
const START = 66

interface Bundle {
  /** Direction the traces run out to, in degrees (0 = right, 90 = down). */
  angle: number
  count: number
  /** How far the longest trace reaches (viewBox units from the centre). */
  reach: number
}

const PINS: Readonly<Record<'brand' | 'boot', readonly Bundle[]>> = {
  // the header: long bundles to the left, top and bottom; short ones on the right, where the
  // club's name is
  brand: [
    { angle: 180, count: 7, reach: 128 },
    { angle: 270, count: 5, reach: 126 },
    { angle: 90, count: 5, reach: 126 },
    { angle: 225, count: 3, reach: 122 },
    { angle: 135, count: 3, reach: 122 },
    { angle: 315, count: 2, reach: 96 },
    { angle: 45, count: 2, reach: 96 },
  ],
  // the opening: the name and the modules are below the logo, so the pins go left, right, up
  boot: [
    { angle: 180, count: 7, reach: 128 },
    { angle: 0, count: 7, reach: 128 },
    { angle: 270, count: 5, reach: 126 },
    { angle: 225, count: 3, reach: 122 },
    { angle: 315, count: 3, reach: 122 },
  ],
}

const SPACING = 9

interface Trace {
  d: string
  /** Where the trace ends: a via (a small ring). */
  end: readonly [number, number]
}

/**
 * The traces: each leaves the ring, runs out along its bundle, fans away from the bundle's middle
 * with one 45° jog and ends in a via; lengths alternate like real pins.
 */
function chipTraces(bundles: readonly Bundle[]): Trace[] {
  const traces: Trace[] = []
  for (const bundle of bundles) {
    const rad = (bundle.angle * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    // (along, across) → viewBox x, y
    const at = (a: number, o: number) =>
      [
        Math.round((a * cos - o * sin) * 10) / 10,
        Math.round((a * sin + o * cos) * 10) / 10,
      ] as const
    for (let k = 0; k < bundle.count; k++) {
      const o = (k - (bundle.count - 1) / 2) * SPACING
      const a0 = Math.sqrt(START * START - o * o)
      const fan = Math.sign(o) * Math.abs(o) * 0.7
      const a1 = a0 + 8 + (k % 2) * 4
      const a2 = a1 + Math.abs(fan)
      const end = bundle.reach - (k % 3) * 14
      const points = [at(a0, o), at(a1, o), at(a2, o + fan), at(Math.max(end, a2 + 6), o + fan)]
      traces.push({ d: `M${points.map((p) => p.join(' ')).join('L')}`, end: points[3] })
    }
  }
  return traces
}

const TRACES = { brand: chipTraces(PINS.brand), boot: chipTraces(PINS.boot) }

interface Props {
  /** The logo's size in px; the frame around it is EXTENT times as wide. */
  size: number
  /**
   * The opening: the ring and the traces draw themselves in, then the pulses start; the pins
   * leave the bottom free for the name below.
   */
  boot?: boolean
  className?: string
  /** The logo (an image, or the button screen's tappable logo). */
  children: ReactNode
}

/** The logo in its chip: ring, traces, vias, and light running out along the traces. */
export function LogoChip({ size, boot = false, className = '', children }: Props) {
  const id = useId()
  const box = size * EXTENT
  const traces = TRACES[boot ? 'boot' : 'brand']
  return (
    <span
      className={`${s.chip} ${className}`}
      style={{ width: size, height: size }}
      data-boot={boot || undefined}
    >
      <svg
        className={s.frame}
        viewBox={`${-50 * EXTENT} ${-50 * EXTENT} ${100 * EXTENT} ${100 * EXTENT}`}
        style={{ width: box, height: box, margin: (size - box) / 2 }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`${id}-t`} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="130">
            <stop offset="0.45" stopColor="var(--cyan)" />
            <stop offset="1" stopColor="var(--code-green)" />
          </radialGradient>
        </defs>
        <g className={s.traces} stroke={`url(#${id}-t)`}>
          {traces.map((t, i) => (
            <path key={i} d={t.d} pathLength={100} style={{ '--i': i } as React.CSSProperties} />
          ))}
        </g>
        <g className={s.pulses}>
          {traces.map((t, i) => (
            <path
              key={i}
              d={t.d}
              pathLength={100}
              style={{ animationDelay: `${(i * 0.37) % 3.4}s` }}
            />
          ))}
        </g>
        <g className={s.vias}>
          {traces.map((t, i) => (
            <circle
              key={i}
              cx={t.end[0]}
              cy={t.end[1]}
              r={2.6}
              style={{ '--i': i } as React.CSSProperties}
            />
          ))}
        </g>
        <circle className={s.outer} r={61} />
        <circle className={s.ring} r={55} pathLength={100} />
      </svg>
      {children}
    </span>
  )
}
