import { useEffect, useEffectEvent } from 'react'
import { dur } from '@/app/timing'
import { EVENT_TEXT } from '@/data/texts'
import { coolingShiftMs } from '@/game/events'
import type { OverheatMode } from '@/game/engine'
import s from './OverheatAlarm.module.css'

/** How long the Overheat alarm stays before the cooling (an animation wait). */
export const OVERHEAT_ALARM_MS = 1800

interface Props {
  mode: OverheatMode
  onReady: () => void
}

/** SYSTEM OVERHEAT alarm (§3.1): the screen turns red-hot, then the cooling comes. */
export function OverheatAlarm({ mode, onReady }: Props) {
  const ready = useEffectEvent(onReady)
  useEffect(() => {
    const id = window.setTimeout(() => ready(), dur(OVERHEAT_ALARM_MS))
    return () => window.clearTimeout(id)
  }, [])

  return (
    <section className={s.root} data-testid="overheat" data-mode={mode}>
      <div className={s.heat} aria-hidden="true" />
      <h2 className={`${s.title} glitch`} data-text={EVENT_TEXT.overheat.title}>
        {EVENT_TEXT.overheat.title}
      </h2>
      <p className={s.code}>
        {mode === 'fast'
          ? '> işlemci aşırı ısındı: çok hızlısın'
          : '> çekirdek kritik: süre tükeniyor'}
      </p>
      <p className={s.lead} data-testid="overheat-lead">
        {mode === 'fast'
          ? `3 saniye ekrana dokunma. Dokunursan −${-coolingShiftMs('fast', false) / 1000} sn!`
          : `3 saniye ekrana dokunma: işlemci soğusun, +${coolingShiftMs('slow', true) / 1000} sn kazan.`}
      </p>
    </section>
  )
}
