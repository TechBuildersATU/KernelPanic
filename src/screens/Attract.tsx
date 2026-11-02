import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { dur, ignoreAbort, sleep } from '@/app/timing'
import { enterFullscreen, keepAwake } from '@/app/kiosk'
import { usePressGuard } from '@/app/usePress'
import { unlockAudio } from '@/audio/engine'
import { playSfx } from '@/audio/sfx'
import { GearIcon, QrIcon } from '@/components/icons'
import { Eye } from '@/components/eye/Eye'
import { GazeDirector } from '@/components/eye/motion'
import { SocialDialog } from '@/components/SocialDialog'
import { TopBar } from '@/components/TopBar'
import { DISCLAIMERS } from '@/data/texts'
import {
  ATTRACT_NUDGE_MS,
  DISCLAIMER_ROTATE_MS,
  DUEL_READY_WAIT_MS,
  EASTER_EGG_TAPS,
  EYE_LOOK_MS,
  EYE_TOUCH_LOOK_MS,
  PRESS_MS,
} from '@/game/config'
import s from './Attract.module.css'

const TYPE_MS = 34

export type Mode = 'solo' | 'duel'

/** Types the disclaimers one after another (§2.1). */
function useTypewriter(lines: readonly string[]): string {
  const [line, setLine] = useState(0)
  const [chars, setChars] = useState(0)

  useEffect(() => {
    const text = lines[line]
    if (chars < text.length) {
      const id = window.setTimeout(() => setChars((c) => c + 1), TYPE_MS)
      return () => window.clearTimeout(id)
    }
    const id = window.setTimeout(() => {
      setLine((l) => (l + 1) % lines.length)
      setChars(0)
    }, DISCLAIMER_ROTATE_MS)
    return () => window.clearTimeout(id)
  }, [lines, line, chars])

  return lines[line].slice(0, chars)
}

/** How long the "sudo" easter egg answer stays on screen. */
const SUDO_MS = 4000

interface Props {
  mode: Mode
  onMode: (mode: Mode) => void
  /** The eye was pressed (solo), or both players pressed theirs (duel). */
  onPress: () => void
  onSettings: () => void
}

/**
 * The button screen (§2.1). Solo: one big eye in the hazard ring, looking around (pressing it is
 * pressing the button). Duel (§2.5): two eyes, one per player, looking together — the system only
 * falls once both have pressed theirs; a lone press waits for the other player and lets go after
 * a while. Wherever the screen is touched, the eyes look there.
 */
export function Attract({ mode, onMode, onPress, onSettings }: Props) {
  const [pressed, setPressed] = useState(false)
  const [ready, setReady] = useState<[boolean, boolean]>([false, false])
  const [off, setOff] = useState(false)
  const [nudge, setNudge] = useState(false)
  const [lastTouch, setLastTouch] = useState(0)
  const [social, setSocial] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const disclaimer = useTypewriter(DISCLAIMERS)
  const [sudo, setSudo] = useState(false)
  const taps = useRef<number[]>([])
  const [director] = useState(() => new GazeDirector(EYE_LOOK_MS, EYE_TOUCH_LOOK_MS))

  useEffect(() => {
    director.start()
    return () => director.stop()
  }, [director])

  // Logo: five quick taps → the "sudo" easter egg (the settings have their own button now).
  const logoTap = () => {
    const t = performance.now()
    taps.current = [...taps.current.filter((at) => t - at < 3000), t]
    if (taps.current.length >= EASTER_EGG_TAPS) {
      taps.current = []
      setSudo(true)
      playSfx('wrong')
    }
  }
  useEffect(() => {
    if (!sudo) return
    const id = window.setTimeout(() => setSudo(false), SUDO_MS)
    return () => window.clearTimeout(id)
  }, [sudo])

  // Created inside the effect: StrictMode's mount → unmount → mount must not leave an aborted
  // controller behind.
  useEffect(() => {
    const controller = new AbortController()
    abort.current = controller
    return () => controller.abort()
  }, [])

  // Nobody touched the screen for a while: the button starts asking for it.
  useEffect(() => {
    const id = window.setTimeout(() => setNudge(true), ATTRACT_NUDGE_MS)
    return () => window.clearTimeout(id)
  }, [lastTouch])
  const touched = (e: ReactPointerEvent) => {
    setNudge(false)
    setLastTouch((n) => n + 1)
    // the eyes look where the screen was touched (a press on an eye is that eye's own business)
    if (!(e.target instanceof Element && e.target.closest('[data-eye]')))
      director.touch(e.clientX, e.clientY)
  }

  /** The button goes down, the room dims and leans in, then the hack. */
  const fall = () => {
    if (!abort.current) return
    setPressed(true)
    const signal = abort.current.signal
    sleep(dur(150), signal)
      .then(() => {
        setOff(true)
        return sleep(dur(PRESS_MS - 150), signal)
      })
      .then(onPress)
      .catch(ignoreAbort)
  }

  const press = usePressGuard(() => {
    if (pressed) return
    unlockAudio()
    keepAwake()
    enterFullscreen()
    playSfx('press')
    fall()
  }, 1000)

  // bored eyes squint at the visitor until somebody touches the screen
  useEffect(() => {
    director.setNudge(nudge && !pressed)
  }, [director, nudge, pressed])

  const pressSide = (side: 0 | 1) => {
    if (pressed || ready[side]) return
    unlockAudio()
    keepAwake()
    enterFullscreen()
    playSfx('press')
    setReady((r) => (side === 0 ? [true, r[1]] : [r[0], true]))
  }

  // duel: both pressed → the system falls; one alone waits for the other, then lets go
  const both = ready[0] && ready[1]
  const one = ready[0] !== ready[1]
  const fallTogether = useEffectEvent(() => fall())
  useEffect(() => {
    if (both && !pressed) {
      const id = window.setTimeout(() => fallTogether(), dur(250))
      return () => window.clearTimeout(id)
    }
    if (!one) return
    const id = window.setTimeout(() => setReady([false, false]), DUEL_READY_WAIT_MS)
    return () => window.clearTimeout(id)
  }, [both, one, pressed])

  const switchMode = (next: Mode) => {
    if (next === mode || pressed) return
    playSfx('tick')
    setReady([false, false])
    onMode(next)
  }

  return (
    <main className={s.root} data-testid="attract" data-mode={mode} onPointerDown={touched}>
      {/* the button's red light swells out over the room; the world turns red with it */}
      {off && <div className={s.bloom} data-mode={mode} aria-hidden="true" />}
      {/* the header stays put (it carries over to the hack screen); only the room leans in */}
      <TopBar
        status="stable"
        logo={
          <button
            type="button"
            className={s.logoButton}
            data-testid="logo"
            aria-label="ATÜ TechBuilders logosu"
            onPointerDown={logoTap}
            onContextMenu={(e) => e.preventDefault()}
          >
            <img className={s.logo} src="/logo/techbuilders_logo.png" alt="ATÜ TechBuilders" />
          </button>
        }
        actions={
          <button
            type="button"
            className={s.iconButton}
            data-testid="btn-settings"
            aria-label="Ayarlar"
            onClick={() => {
              playSfx('tick')
              onSettings()
            }}
          >
            <GearIcon />
          </button>
        }
      />
      <div className={s.screen} data-off={off}>
        {mode === 'solo' ? (
          <div className={s.stage}>
            <Eye director={director} onPress={press} pressed={pressed} nudge={nudge && !pressed} />
          </div>
        ) : (
          <div className={s.duel} data-testid="duel-ready">
            {([0, 1] as const).map((side) => (
              <div key={side} className={s.player} data-side={side + 1} data-ready={ready[side]}>
                <p className={s.playerTag}>
                  <b>{side + 1}</b> OYUNCU {side + 1}
                </p>
                <div className={s.small}>
                  <Eye
                    director={director}
                    testId={`btn-panic-${side + 1}`}
                    player={side === 0 ? 1 : 2}
                    onPress={() => pressSide(side)}
                    ready={ready[side]}
                    pressed={pressed}
                    nudge={nudge && !ready[side]}
                  />
                </div>
                <p className={s.playerState} data-testid={`ready-${side + 1}`}>
                  {ready[side]
                    ? both
                      ? 'HAZIR ✓'
                      : 'HAZIR ✓ · rakip bekleniyor'
                    : 'Dokununca hazırsın'}
                </p>
              </div>
            ))}
            <span className={s.versus} aria-hidden="true">
              VS
            </span>
          </div>
        )}

        {sudo ? (
          <p className={s.disclaimer} data-testid="sudo" data-tone="bad">
            <span className={s.prompt}>$</span> sudo fix-system: erişim reddedildi. Butona basman
            gerekiyor.
          </p>
        ) : mode === 'duel' ? (
          <p className={s.disclaimer} data-testid="disclaimer">
            <span className={s.prompt}>&gt;</span> İkiniz de kendi gözünüze dokunun. Sistemi önce
            kim kurtaracak?
          </p>
        ) : (
          <p className={s.disclaimer} data-testid="disclaimer" aria-live="off">
            <span className={s.prompt}>&gt;</span> {disclaimer}
            <span className={s.caret} aria-hidden="true" />
          </p>
        )}
      </div>

      <div className={s.bottom}>
        <div className={s.modes} role="group" aria-label="Oyun modu">
          <button
            type="button"
            aria-pressed={mode === 'solo'}
            data-testid="mode-solo"
            onClick={() => switchMode('solo')}
          >
            TEK KİŞİ
          </button>
          <button
            type="button"
            aria-pressed={mode === 'duel'}
            data-testid="mode-duel"
            onClick={() => switchMode('duel')}
          >
            1v1 DÜELLO
          </button>
        </div>
        <button
          type="button"
          className={s.follow}
          data-testid="btn-social"
          onClick={() => {
            playSfx('tick')
            setSocial(true)
          }}
        >
          <QrIcon />
          Bizi takip edin
        </button>
      </div>

      {social && <SocialDialog onClose={() => setSocial(false)} />}
    </main>
  )
}
