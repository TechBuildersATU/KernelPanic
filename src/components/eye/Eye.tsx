import { useEffect, useId, useRef } from 'react'
import { prefersReducedMotion } from '@/app/timing'
import { lidPath } from './geometry'
import { EyeMotion, type EyeState, type GazeDirector } from './motion'
import s from './Eye.module.css'

// The hero of the button screen (§2.1): a cyber eye in place of the old red button. From the
// outside in: sonar rings, the slowly turning hazard ring, the warning band ("BASMAK ÜZERESİN"),
// a metal bezel and the lens — a cyan iris whose ring refocuses as it looks, a red core in the
// pupil, metal lids that blink. It looks somewhere else every few seconds and wherever the screen
// is touched (GazeDirector); pressing it is pressing the button.

const SIZE = 480
const C = SIZE / 2
// Top text sits on a smaller radius (glyphs grow outwards), bottom text on a larger one
// (glyphs grow inwards), so both stay inside the band.
const R_TOP = 184
const R_BOTTOM = 206
const TOP_ARC = `M ${C - R_TOP} ${C} A ${R_TOP} ${R_TOP} 0 0 1 ${C + R_TOP} ${C}`
const BOTTOM_ARC = `M ${C - R_BOTTOM} ${C} A ${R_BOTTOM} ${R_BOTTOM} 0 0 0 ${C + R_BOTTOM} ${C}`
/** Faint scan lines across the glass. */
const SCAN_LINES = Array.from({ length: 50 }, (_, i) => 92 + i * 6)
const IRIS = 'var(--eye-iris)'

interface Props {
  director: GazeDirector
  onPress: () => void
  /** The system falls: the eye opens wide and turns red. */
  pressed: boolean
  /** Duel: this player pressed and waits for the other (the eye looks across at them). */
  ready?: boolean
  /** Duel: whose eye it is (1 on the left, 2 on the right). */
  player?: 1 | 2
  /** Idle for a while: the director makes the eyes squint at the visitor (marked for tests). */
  nudge: boolean
  /** The duel shows two eyes: `btn-panic-1`, `btn-panic-2`. */
  testId?: string
}

export function Eye({
  director,
  onPress,
  pressed,
  ready = false,
  player,
  nudge,
  testId = 'btn-panic',
}: Props) {
  // two eyes can be on screen (the duel): each needs its own ids
  const id = useId().replace(/[^a-z0-9]/gi, '')
  const button = useRef<HTMLButtonElement>(null)
  const look = useRef<SVGGElement>(null)
  const pupil = useRef<SVGGElement>(null)
  const spin = useRef<SVGGElement>(null)
  const lidTop = useRef<SVGPathElement>(null)
  const lidBottom = useRef<SVGPathElement>(null)
  const motion = useRef<EyeMotion | null>(null)

  useEffect(() => {
    const parts = {
      button: button.current,
      look: look.current,
      pupil: pupil.current,
      spin: spin.current,
      lidTop: lidTop.current,
      lidBottom: lidBottom.current,
    }
    if (
      !parts.button ||
      !parts.look ||
      !parts.pupil ||
      !parts.spin ||
      !parts.lidTop ||
      !parts.lidBottom
    )
      return
    const eye = new EyeMotion(
      {
        button: parts.button,
        look: parts.look,
        pupil: parts.pupil,
        spin: parts.spin,
        lidTop: parts.lidTop,
        lidBottom: parts.lidBottom,
      },
      prefersReducedMotion(),
    )
    motion.current = eye
    const remove = director.add(eye)
    return () => {
      remove()
      motion.current = null
    }
  }, [director])

  const state: EyeState = pressed
    ? 'pressed'
    : ready
      ? player === 2
        ? 'ready-left'
        : 'ready-right'
      : 'free'
  useEffect(() => {
    motion.current?.state(state, performance.now())
  }, [state])

  const u = (name: string) => `${name}-${id}`
  const url = (name: string) => `url(#${u(name)})`

  return (
    <button
      ref={button}
      type="button"
      className={s.button}
      data-testid={testId}
      data-eye
      data-pressed={pressed || ready}
      data-hot={pressed}
      data-ready={ready}
      data-nudge={nudge}
      aria-label="Göz. Basmak üzeresin, sonuçlarından sorumlu değiliz."
      onClick={onPress}
    >
      <span className={s.sonar} aria-hidden="true" />
      <span className={`${s.sonar} ${s.sonarLate}`} aria-hidden="true" />
      <span className={s.hazard} aria-hidden="true" />
      <svg className={s.band} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle cx={C} cy={C} r={196} className={s.bandFill} />
        <circle cx={C} cy={C} r={173} className={s.bandLine} />
        <circle cx={C} cy={C} r={219} className={s.bandLine} />
        <path id={u('top')} d={TOP_ARC} fill="none" />
        <path id={u('bottom')} d={BOTTOM_ARC} fill="none" />
        <text className={s.bandText}>
          <textPath href={'#' + u('top')} startOffset="50%" textAnchor="middle">
            BASMAK ÜZERESİN
          </textPath>
        </text>
        <text className={s.bandText}>
          <textPath href={'#' + u('bottom')} startOffset="50%" textAnchor="middle">
            SONUÇLARINDAN SORUMLU DEĞİLİZ
          </textPath>
        </text>
        <text
          className={s.bandMark}
          x={C - 196}
          y={C}
          textAnchor="middle"
          dominantBaseline="central"
        >
          ⚠
        </text>
        <text
          className={s.bandMark}
          x={C + 196}
          y={C}
          textAnchor="middle"
          dominantBaseline="central"
        >
          ⚠
        </text>
      </svg>
      <span className={s.core} aria-hidden="true">
        <span className={s.glow} />
        <span className={s.bezel} />
        <svg className={s.lens} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <defs>
            <radialGradient id={u('glass')} cx="50%" cy="42%" r="58%">
              <stop offset="0" stopColor="#1a2a5a" />
              <stop offset="0.65" stopColor="#0a132e" />
              <stop offset="1" stopColor="#03060f" />
            </radialGradient>
            <radialGradient id={u('iris')} cx="0" cy="0" r="78" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#02040a" />
              <stop
                offset="0.5"
                style={{ stopColor: `color-mix(in srgb, ${IRIS} 22%, #02040a)` }}
              />
              <stop
                offset="0.86"
                style={{ stopColor: `color-mix(in srgb, ${IRIS} 70%, #02040a)` }}
              />
              <stop offset="1" style={{ stopColor: IRIS }} />
            </radialGradient>
            <radialGradient id={u('halo')} cx="0" cy="0" r="112" gradientUnits="userSpaceOnUse">
              <stop offset="0.55" style={{ stopColor: IRIS, stopOpacity: 0.4 }} />
              <stop offset="1" style={{ stopColor: IRIS, stopOpacity: 0 }} />
            </radialGradient>
            <linearGradient id={u('lidT')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3a4766" />
              <stop offset="0.7" stopColor="#161f38" />
              <stop offset="1" stopColor="#0c1326" />
            </linearGradient>
            <linearGradient id={u('lidB')} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#3a4766" />
              <stop offset="0.7" stopColor="#161f38" />
              <stop offset="1" stopColor="#0c1326" />
            </linearGradient>
            <clipPath id={u('aperture')}>
              <circle cx={C} cy={C} r={150} />
            </clipPath>
            <filter id={u('blur')} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>
          <circle cx={C} cy={C} r={152} fill="#02040a" />
          <g clipPath={url('aperture')}>
            <circle cx={C} cy={C} r={150} fill={url('glass')} />
            <g stroke="#44efec" strokeOpacity={0.07} strokeWidth={1}>
              {SCAN_LINES.map((y) => (
                <line key={y} x1={80} y1={y} x2={400} y2={y} />
              ))}
            </g>
            <g ref={look} transform={`translate(${C} ${C})`}>
              <circle r={112} fill={url('halo')} />
              <circle r={78} fill={url('iris')} />
              <g ref={spin}>
                <circle
                  r={64}
                  fill="none"
                  style={{ stroke: IRIS }}
                  strokeWidth={8}
                  strokeDasharray="9.2 7.555"
                  opacity={0.7}
                />
              </g>
              <circle r={78} fill="none" style={{ stroke: IRIS }} strokeWidth={3} />
              <circle
                r={47}
                fill="none"
                style={{ stroke: IRIS }}
                strokeWidth={1.5}
                opacity={0.55}
              />
              <g ref={pupil}>
                <circle r={32} fill="#010207" />
                <circle r={12} fill="var(--alarm)" filter={url('blur')} />
                <circle r={6} className={s.spark} />
              </g>
              <path
                d="M-58 -30 A66 66 0 0 1 -30 -59"
                fill="none"
                stroke="#fff"
                strokeOpacity={0.55}
                strokeWidth={5}
                strokeLinecap="round"
              />
            </g>
            <ellipse
              cx={188}
              cy={160}
              rx={74}
              ry={26}
              fill="#fff"
              opacity={0.07}
              transform="rotate(-30 188 160)"
            />
            <path
              ref={lidTop}
              d={lidPath('top', 0)}
              fill={url('lidT')}
              style={{ stroke: IRIS }}
              strokeWidth={3}
            />
            <path
              ref={lidBottom}
              d={lidPath('bottom', 0)}
              fill={url('lidB')}
              style={{ stroke: IRIS }}
              strokeOpacity={0.55}
              strokeWidth={2}
            />
          </g>
          <circle
            cx={C}
            cy={C}
            r={150}
            fill="none"
            stroke="#000"
            strokeOpacity={0.6}
            strokeWidth={5}
          />
        </svg>
      </span>
    </button>
  )
}
