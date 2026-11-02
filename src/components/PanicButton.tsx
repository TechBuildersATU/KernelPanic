import { useId } from 'react'
import s from './PanicButton.module.css'

// The hero of the attract screen (§2.1): a big arcade emergency button. From the outside in:
// a slowly turning hazard-stripe ring, a dark label band with the warning running around it,
// a metal bezel and the glossy red cap with a power symbol.

const SIZE = 480
const C = SIZE / 2
// Top text sits on a smaller radius (glyphs grow outwards), bottom text on a larger one
// (glyphs grow inwards), so both stay inside the band.
const R_TOP = 184
const R_BOTTOM = 206

const TOP_ARC = `M ${C - R_TOP} ${C} A ${R_TOP} ${R_TOP} 0 0 1 ${C + R_TOP} ${C}`
const BOTTOM_ARC = `M ${C - R_BOTTOM} ${C} A ${R_BOTTOM} ${R_BOTTOM} 0 0 0 ${C + R_BOTTOM} ${C}`

interface Props {
  onPress: () => void
  pressed: boolean
  /** Idle for a while: the button gives a little shake now and then. */
  nudge: boolean
  /** The duel shows two buttons: `btn-panic-1`, `btn-panic-2`. */
  testId?: string
}

export function PanicButton({ onPress, pressed, nudge, testId = 'btn-panic' }: Props) {
  // two buttons can be on screen (the duel): each needs its own text paths
  const id = useId().replace(/[^a-z0-9]/gi, '')
  const top = `kp-top-${id}`
  const bottom = `kp-bottom-${id}`
  return (
    <button
      type="button"
      className={s.button}
      data-testid={testId}
      data-pressed={pressed}
      data-nudge={nudge}
      aria-label="Kırmızı buton. Basmak üzeresin, sonuçlarından sorumlu değiliz."
      onClick={onPress}
    >
      <span className={s.sonar} aria-hidden="true" />
      <span className={`${s.sonar} ${s.sonarLate}`} aria-hidden="true" />
      <span className={s.hazard} aria-hidden="true" />
      <svg className={s.band} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        <circle cx={C} cy={C} r={196} className={s.bandFill} />
        <circle cx={C} cy={C} r={173} className={s.bandLine} />
        <circle cx={C} cy={C} r={219} className={s.bandLine} />
        <path id={top} d={TOP_ARC} fill="none" />
        <path id={bottom} d={BOTTOM_ARC} fill="none" />
        <text className={s.bandText}>
          <textPath href={'#' + top} startOffset="50%" textAnchor="middle">
            BASMAK ÜZERESİN
          </textPath>
        </text>
        <text className={s.bandText}>
          <textPath href={'#' + bottom} startOffset="50%" textAnchor="middle">
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
      <span className={s.bezel} aria-hidden="true" />
      <span className={s.cap} aria-hidden="true">
        <svg className={s.power} viewBox="0 0 64 64">
          <path d="M32 8 V30" />
          <path d="M19 16 A20 20 0 1 0 45 16" />
        </svg>
      </span>
    </button>
  )
}
