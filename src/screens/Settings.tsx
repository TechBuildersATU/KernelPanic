import { useState } from 'react'
import {
  readRoundSeconds,
  readMusicOff,
  readSoundOff,
  readVolume,
  writeRoundSeconds,
  writeMusicOff,
  writeSoundOff,
  writeVolume,
} from '@/app/settings'
import { usePressGuard } from '@/app/usePress'
import { setMasterVolume, unlockAudio } from '@/audio/engine'
import { refreshMusic } from '@/audio/music'
import { playSfx } from '@/audio/sfx'
import { ROUND_SECONDS_OPTIONS } from '@/game/config'
import type { RoundSeconds } from '@/game/types'
import s from './Settings.module.css'

const VOLUME_STEP = 0.1

interface Props {
  onClose: () => void
}

/** Settings (the gear on the button screen): the round length and the sound, nothing else. */
export function Settings({ onClose }: Props) {
  const [seconds, setSeconds] = useState<RoundSeconds>(readRoundSeconds)
  const [soundOff, setSoundOff] = useState(readSoundOff)
  const [volume, setVolume] = useState(readVolume)
  const [musicOff, setMusicOff] = useState(readMusicOff)
  const close = usePressGuard(onClose)

  const changeVolume = (delta: number) => {
    const next = Math.round(Math.min(1, Math.max(0, volume + delta)) * 10) / 10
    setVolume(next)
    writeVolume(next)
    setMasterVolume(next)
  }

  return (
    <main className={s.root} data-testid="settings">
      <h1 className={s.title}>Ayarlar</h1>
      <p className={s.sub}>Tur süresi ve ses. Değişiklikler bu cihazda saklanır.</p>

      <section className={s.row}>
        <h2>Tur süresi</h2>
        <div className={s.segment} role="group" aria-label="Tur süresi">
          {ROUND_SECONDS_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={seconds === option}
              data-testid={`round-${option}`}
              onClick={() => {
                setSeconds(option)
                writeRoundSeconds(option)
              }}
            >
              {option} sn
            </button>
          ))}
        </div>
      </section>

      <section className={s.row}>
        <h2>Ses</h2>
        <div className={s.controls}>
          <button
            type="button"
            className={s.toggle}
            aria-pressed={!soundOff}
            data-testid="btn-sound"
            onClick={() => {
              setSoundOff(!soundOff)
              writeSoundOff(!soundOff)
            }}
          >
            {soundOff ? 'Kapalı' : 'Açık'}
          </button>
          <button
            type="button"
            className={s.step}
            aria-label="Sesi kıs"
            data-testid="btn-vol-down"
            disabled={volume <= 0}
            onClick={() => changeVolume(-VOLUME_STEP)}
          >
            −
          </button>
          <span className={s.value} data-testid="volume">
            %{Math.round(volume * 100)}
          </span>
          <button
            type="button"
            className={s.step}
            aria-label="Sesi aç"
            data-testid="btn-vol-up"
            disabled={volume >= 1}
            onClick={() => changeVolume(VOLUME_STEP)}
          >
            +
          </button>
          <button
            type="button"
            className={s.toggle}
            data-testid="btn-sound-test"
            onClick={() => {
              unlockAudio()
              playSfx('alarm')
            }}
          >
            Ses testi
          </button>
        </div>
      </section>

      <section className={s.row}>
        <h2>Müzik</h2>
        <button
          type="button"
          className={s.toggle}
          aria-pressed={!musicOff}
          data-testid="btn-music"
          onClick={() => {
            setMusicOff(!musicOff)
            writeMusicOff(!musicOff)
            refreshMusic()
          }}
        >
          {musicOff ? 'Kapalı' : 'Açık'}
        </button>
        <p className={s.note}>
          Ana menüde, aşamalarda ve sonuçta çalan arka plan müziği. Efekt sesleri ayrı.
        </p>
      </section>

      <button type="button" className={s.close} data-testid="btn-close-settings" onClick={close}>
        Kapat
      </button>
    </main>
  )
}
