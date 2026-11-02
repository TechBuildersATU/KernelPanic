import { useEffect, useEffectEvent, useState } from 'react'
import { dur, ignoreAbort, sleep } from '@/app/timing'
import { playSfx } from '@/audio/sfx'
import { TopBar } from '@/components/TopBar'
import { useScramble } from '@/fx/useScramble'
import { COUNTDOWN_STEP_MS, HACK_INTRO_MS } from '@/game/config'
import s from './Hack.module.css'

const TITLE = 'SYSTEM FAILURE'
const LOGS = [
  { text: 'kernel: kritik süreç sonlandırıldı', bad: true },
  { text: 'güç yeniden yönlendiriliyor... BAŞARISIZ', bad: true },
  { text: 'kullanıcı girdisi: GEREKLİ', bad: false },
]

/**
 * "The system got hacked" (§2.2). Same room, same header as the button screen — only the
 * status light turns to "Kritik hata" and the world turns red (src/fx/World.tsx). SYSTEM FAILURE
 * settles out of noise, the logs run in a panel cut like the question card, the message, 3-2-1;
 * the shared screen switch then dissolves it into the first question.
 */
export function Hack({
  roundSeconds,
  duel = false,
  onDone,
}: {
  roundSeconds: number
  /** Two players: the message speaks to both. */
  duel?: boolean
  onDone: () => void
}) {
  const [titleOn, setTitleOn] = useState(false)
  const [logs, setLogs] = useState(0)
  const [message, setMessage] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [loss, setLoss] = useState(0)
  const title = useScramble(TITLE, titleOn, 900)
  const done = useEffectEvent(onDone)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const run = async () => {
      playSfx('alarm')
      await sleep(dur(200), signal)
      setTitleOn(true)
      await sleep(dur(700), signal)
      for (let i = 1; i <= LOGS.length; i++) {
        setLogs(i)
        playSfx('type')
        await sleep(dur(220), signal)
      }
      setMessage(true)
      await sleep(dur(HACK_INTRO_MS - 200 - 700 - LOGS.length * 220), signal)
      setLoss(100)
      for (const n of [3, 2, 1]) {
        setCount(n)
        playSfx('count')
        await sleep(dur(COUNTDOWN_STEP_MS), signal)
      }
      playSfx('go')
      done()
    }
    run().catch(ignoreAbort)
    return () => controller.abort()
  }, [])

  // "system loss" climbs while the logs scroll
  useEffect(() => {
    if (!titleOn || loss >= 100) return
    const id = window.setTimeout(() => setLoss((v) => Math.min(100, v + 3)), dur(30))
    return () => window.clearTimeout(id)
  }, [titleOn, loss])

  return (
    <main className={s.root} data-testid="hack">
      <TopBar status="critical" />

      <section className={s.center} data-counting={count !== null}>
        <h2 className={`${s.title} glitch`} data-text={title} aria-label={TITLE}>
          {title}
        </h2>

        <div className={s.panel} data-on={titleOn}>
          <div className={s.loss} data-testid="system-loss">
            <span>Sistem kaybı</span>
            <div className={s.lossBar}>
              <div style={{ transform: `scaleX(${loss / 100})` }} />
            </div>
            <strong>%{loss}</strong>
          </div>
          <ul className={s.log} aria-label="Sistem günlüğü">
            {LOGS.slice(0, logs).map((line) => (
              <li key={line.text} data-bad={line.bad}>
                &gt; {line.text}
              </li>
            ))}
          </ul>
        </div>

        <div className={s.message} data-visible={message}>
          <p>Kritik sistem devre dışı kaldı.</p>
          {duel ? (
            <p>
              İkinizin de <strong>{roundSeconds} saniyesi</strong> var. Önce kim kurtaracak?
            </p>
          ) : (
            <p>
              Sistemi kurtarmak için <strong>{roundSeconds} saniyen</strong> var.
            </p>
          )}
        </div>
      </section>

      {count !== null && (
        <div className={s.countdown} data-testid="countdown" aria-live="assertive">
          <div key={count} className={s.countWrap}>
            <svg className={s.ring} viewBox="0 0 300 300" aria-hidden="true">
              <circle cx="150" cy="150" r="136" className={s.ringTrack} />
              <circle
                cx="150"
                cy="150"
                r="136"
                className={s.ringFill}
                style={{ animationDuration: `${dur(COUNTDOWN_STEP_MS)}ms` }}
              />
            </svg>
            <span className={s.count}>{count}</span>
          </div>
          <span className={s.countLabel}>Kurtarma protokolü başlıyor</span>
        </div>
      )}
    </main>
  )
}
