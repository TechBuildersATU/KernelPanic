import { useEffect, useEffectEvent, useState } from 'react'
import { prefersReducedMotion } from '@/app/timing'
import { playSfx } from '@/audio/sfx'
import { LogoChip } from '@/components/LogoChip'
import { STAGE_TEXT } from '@/data/texts'
import { STAGE_ORDER } from '@/game/config'
import { useScramble } from './useScramble'
import s from './BootIntro.module.css'

const LOGO = '/logo/techbuilders_logo.png'
/** How long the opening plays before it switches off into the game (ms). */
const HOLD_MS = 2600
/** The switch-off: the picture folds into a bright line and goes. */
const LEAVE_MS = 650
/** Longest wait for the fonts and the logo before the opening plays anyway (ms). */
const READY_MAX_MS = 1500

/** The opening's fonts and logo, loaded before anything moves so it never plays half-drawn. */
function loadIntro(): Promise<unknown> {
  const img = new Image()
  img.src = LOGO
  const fonts = document.fonts
    ? Promise.all([
        document.fonts.load('700 64px "JetBrains Mono"'),
        document.fonts.load('700 22px "Chakra Petch"'),
        document.fonts.load('900 18px Orbitron'),
      ])
    : Promise.resolve()
  return Promise.race([
    Promise.all([fonts.catch(() => undefined), img.decode().catch(() => undefined)]),
    new Promise((resolve) => window.setTimeout(resolve, READY_MAX_MS)),
  ])
}

/**
 * The APK's opening (§2.0): on the night blue the club's logo comes up and its chip powers on
 * (the ring closes, the traces run out of it, as on the club's banner), "ATÜ TechBuilders
 * sunar", KERNEL PANIC settles out of noise, the five modules load one by one —
 * then the picture folds into a bright line like an old monitor switching over, and the game is
 * behind it. A tap skips it. Until its fonts and logo are in it shows only the night blue; then it
 * marks <html data-boot="ready">, which lets the APK's launch screen fade out onto it
 * (MainActivity).
 */
export function BootIntro({ onDone }: { onDone: () => void }) {
  const [ready, setReady] = useState(false)
  const [loaded, setLoaded] = useState(0)
  const [leaving, setLeaving] = useState(false)
  // the name starts settling once the logo has sprung in
  const [named, setNamed] = useState(false)
  const title = useScramble('KERNEL PANIC', named, 900)
  const done = useEffectEvent(onDone)

  useEffect(() => {
    let live = true
    void loadIntro().then(() => {
      if (live) setReady(true)
    })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    document.documentElement.dataset.boot = 'ready'
    const quick = prefersReducedMotion()
    const timers = [
      window.setTimeout(() => setNamed(true), 450),
      ...STAGE_ORDER.map((_, i) =>
        window.setTimeout(
          () => {
            setLoaded(i + 1)
            playSfx('type')
          },
          1050 + i * 190,
        ),
      ),
      window.setTimeout(() => setLeaving(true), quick ? 600 : HOLD_MS),
    ]
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [ready])

  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(() => done(), LEAVE_MS)
    return () => window.clearTimeout(t)
  }, [leaving])

  return (
    <div
      className={s.intro}
      data-testid="boot-intro"
      data-ready={ready}
      data-leaving={leaving}
      role="status"
      aria-label="KERNEL PANIC açılıyor"
      onPointerDown={() => setLeaving(true)}
    >
      {ready && (
        <div className={s.content}>
          <div className={s.logo}>
            <LogoChip size={164} boot>
              <img src={LOGO} alt="ATÜ TechBuilders" />
            </LogoChip>
          </div>
          <p className={s.presents}>
            <span className={s.club}>
              ATÜ <b>TECH</b> <i>BUILDERS</i>
            </span>{' '}
            SUNAR
          </p>
          <h1 className={s.title} aria-label="KERNEL PANIC">
            {title}
          </h1>
          <ol className={s.modules} aria-label="Modüller yükleniyor">
            {STAGE_ORDER.map((id, i) => (
              <li key={id} data-on={i < loaded}>
                <i />
                <span>{STAGE_TEXT[id].name}</span>
              </li>
            ))}
          </ol>
          <p className={s.line}>
            &gt; sistem {loaded < STAGE_ORDER.length ? 'yükleniyor' : 'hazır'}
            <span className={s.caret} />
          </p>
        </div>
      )}
    </div>
  )
}
