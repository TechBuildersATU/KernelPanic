import { useEffect, useEffectEvent } from 'react'
import { useNow } from '@/app/useNow'
import { usePressGuard } from '@/app/usePress'
import { EVENT_TEXT } from '@/data/texts'
import {
  EMERGENCY_CHOOSE_MS,
  EMERGENCY_READ_MS,
  RISKY_BONUS_SECONDS,
  RISKY_PENALTY_SECONDS,
} from '@/game/config'
import s from './EmergencyChoice.module.css'

interface Props {
  /** When the choice appeared (the reading time, then the countdown, count from here). */
  since: number
  onChoose: (channel: 'safe' | 'risky') => void
}

/**
 * EMERGENCY MODE (§3.3, solo only): the screen freezes — the round clock stands still and the
 * room's code rain slows to a stop — and the choice is read first: no countdown for a few
 * seconds, then a calm one before the system picks the safe channel. A first-time player has
 * time to read both channels; anyone faster can choose right away.
 */
export function EmergencyChoice({ since, onChoose }: Props) {
  const now = useNow(100)
  const readUntil = since + EMERGENCY_READ_MS
  const reading = now < readUntil
  const left = Math.max(0, Math.min(EMERGENCY_CHOOSE_MS, readUntil + EMERGENCY_CHOOSE_MS - now))
  const choose = usePressGuard(onChoose, 600)

  // Nobody chose in time: the system picks the safe channel.
  const auto = useEffectEvent(() => onChoose('safe'))
  useEffect(() => {
    const id = window.setTimeout(
      () => auto(),
      Math.max(0, since + EMERGENCY_READ_MS + EMERGENCY_CHOOSE_MS - Date.now()),
    )
    return () => window.clearTimeout(id)
  }, [since])

  return (
    <section className={s.root} data-testid="emergency" data-reading={reading}>
      <div className={s.beacon} aria-hidden="true" />
      <div className={s.stripes} aria-hidden="true" />
      <p className={s.frozen} data-testid="emergency-frozen">
        <span className={s.pause} aria-hidden="true" />
        SÜRE DURDU
      </p>
      <h2 className={s.title}>{EVENT_TEXT.emergency.title}</h2>
      <p className={s.lead}>Ana hat çöktü. Hangi yedek kanaldan devam edeceksin?</p>

      <div className={s.channels}>
        <button
          type="button"
          className={s.channel}
          data-channel="safe"
          data-testid="btn-safe"
          onClick={() => choose('safe')}
        >
          <span className={s.name}>GÜVENLİ KANAL</span>
          <span className={s.desc}>Oyunun kolay sürümü. Süreye dokunmaz.</span>
        </button>
        <button
          type="button"
          className={s.channel}
          data-channel="risky"
          data-testid="btn-risky"
          onClick={() => choose('risky')}
        >
          <span className={s.name}>RİSKLİ KANAL</span>
          <span className={s.desc}>
            En zor sürüm. Yeşil geçersen +{RISKY_BONUS_SECONDS} sn, geçemezsen −
            {RISKY_PENALTY_SECONDS} sn.
          </span>
        </button>
      </div>

      <div
        className={s.limit}
        data-testid="emergency-limit"
        aria-label={reading ? 'Okuma süresi' : `Seçim için ${Math.ceil(left / 1000)} saniye`}
      >
        <div
          className={s.limitFill}
          style={{ transform: `scaleX(${left / EMERGENCY_CHOOSE_MS})` }}
        />
      </div>
      <p className={s.hint} data-testid="emergency-hint">
        {reading ? (
          'Acele etme: önce iki kanalı da oku.'
        ) : (
          <>
            Seçmezsen <b>{Math.ceil(left / 1000)} sn</b> sonra sistem güvenli kanalı seçer.
          </>
        )}
      </p>
    </section>
  )
}
