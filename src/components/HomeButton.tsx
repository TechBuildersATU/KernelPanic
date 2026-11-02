import { useEffect, useRef, useState } from 'react'
import { playSfx } from '@/audio/sfx'
import { HomeIcon } from './icons'
import s from './HomeButton.module.css'

/** How long the house button must be held to leave the round. */
export const HOME_HOLD_MS = 1000

/**
 * Back to the button screen from inside a round. It has to be held for a second — a ring fills
 * around the house — so a stray tap in the heat of a stage never ends the game; letting go early
 * cancels. The round is not kept.
 */
export function HomeButton({ onHome, className = '' }: { onHome: () => void; className?: string }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const start = () => {
    window.clearTimeout(timer.current)
    setHolding(true)
    playSfx('tick')
    timer.current = window.setTimeout(() => {
      setHolding(false)
      playSfx('press')
      onHome()
    }, HOME_HOLD_MS)
  }
  const cancel = () => {
    window.clearTimeout(timer.current)
    setHolding(false)
  }

  return (
    <button
      type="button"
      className={`${s.home} ${className}`}
      data-testid="btn-home"
      data-holding={holding}
      aria-label="Ana ekrana dön (basılı tut)"
      style={{ '--hold': `${HOME_HOLD_MS}ms` } as never}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <svg className={s.ring} viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="29" />
      </svg>
      <HomeIcon />
      <span className={s.hint}>basılı tut</span>
    </button>
  )
}
