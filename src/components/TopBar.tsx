import type { ReactNode } from 'react'
import { LogoChip } from './LogoChip'
import s from './TopBar.module.css'

interface Props {
  status: 'stable' | 'critical'
  /** The logo element (the button screen passes its tappable logo for the "sudo" egg). */
  logo?: ReactNode
  /** Small controls next to the status light (the button screen's settings). */
  actions?: ReactNode
}

/**
 * The header shared by the button screen and the hack screen, in the same place on both: when
 * one cross-fades into the other only the status light changes — "Sistem stabil" turns into
 * "Kritik hata" — so the hack happens to the same system instead of a new screen. On the left
 * the club signs its game: the logo in its chip, as on the club's banner, and the club's name.
 */
export function TopBar({ status, logo, actions }: Props) {
  return (
    <header className={s.top} data-topbar>
      <div className={s.brand} data-testid="brand">
        <span className={s.halo} aria-hidden="true" />
        <LogoChip size={100}>
          {logo ?? (
            <img className={s.logo} src="/logo/techbuilders_logo.png" alt="ATÜ TechBuilders" />
          )}
        </LogoChip>
        <p className={s.credit} aria-label="ATÜ TechBuilders">
          <span className={s.uni}>ATÜ</span>
          <span className={s.club}>
            <span className={s.tech}>TECH</span> <span className={s.builders}>BUILDERS</span>
          </span>
        </p>
      </div>
      <h1 className={`${s.title} glitch glitch-rare`} data-text="KERNEL PANIC" data-status={status}>
        KERNEL PANIC
      </h1>
      <div className={s.end}>
        <p className={s.status} data-status={status} data-testid="system-status">
          <span className={s.dot} aria-hidden="true" />
          <span key={status} className={s.statusText}>
            {status === 'stable' ? 'Sistem stabil' : 'Kritik hata'}
          </span>
        </p>
        {actions}
      </div>
    </header>
  )
}
