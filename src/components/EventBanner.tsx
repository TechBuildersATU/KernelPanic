import { EVENT_TEXT } from '@/data/texts'
import type { EventKind } from '@/game/types'
import s from './EventBanner.module.css'

/**
 * The event title, sliding softly out from under the HUD for a moment (§3). It never blocks a
 * tap: the answers stay usable underneath.
 */
export function EventBanner({ kind }: { kind: EventKind }) {
  const text = EVENT_TEXT[kind]
  return (
    <div className={s.banner} data-kind={kind} data-testid={`banner-${kind}`} role="status">
      <strong className={s.title}>{text.title}</strong>
      <span className={s.line}>{text.line}</span>
    </div>
  )
}
