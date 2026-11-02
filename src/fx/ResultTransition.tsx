import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { dur } from '@/app/timing'
import { playSfx, type Sfx } from '@/audio/sfx'
import { STAGE_TEXT } from '@/data/texts'
import { STAGE_COUNT } from '@/game/config'
import type { Mood } from '@/game/events'
import { GRADE_LABEL, isGreen, stageGrade, stageShare } from '@/game/grades'
import type { StageRecord, TitleId } from '@/game/types'
import s from './ResultTransition.module.css'

// The way into the result (§5.3). The transition is not a separate scene: it plays ON the stage
// screen, which stays underneath (App.tsx keeps it mounted, inert) and gets dimmed, frozen or
// switched off while a small piece of the system tells the story on top of it — the restore ring
// closing, the rack lights coming on, an inspector finding the one bug, the boot window, the boot
// menu, the 404 window, the kernel's last words, the LEGEND that does not fill, the power button.
// Whatever event background the round ended on is therefore always the one underneath. The result
// then dissolves in.
//
// App sets --bug-x/--bug-y (the first broken module cell) and --tx/--ty (the timer) on the ending
// container, in stage pixels; the overlay and the screen underneath both read them.

const DEFAULT_MS = 3200
const DURATION: Partial<Record<TitleId, number>> = { 'barely-booted': 2800 }
/** The last part of the transition: it fades out while the result fades in underneath. */
export const TRANSITION_FADE_MS = 700

function transitionMs(title: TitleId): number {
  return DURATION[title] ?? DEFAULT_MS
}

const SOUND: Record<TitleId, Sfx> = {
  'system-savior': 'power',
  'last-second-hero': 'final',
  'all-systems-go': 'success',
  'one-bug-left': 'tick',
  'barely-booted': 'type',
  'safe-mode': 'count',
  'error-404': 'wrong',
  'kernel-panic': 'crash',
  'almost-a-legend': 'penalty',
  'turn-it-off-and-on': 'crash',
}

const seconds = (ms: number) => Math.ceil(Math.abs(ms) / 1000)

/** Words fade in one after another out of a blur. */
function Say({ text, delay, tone }: { text: string; delay: number; tone: string }) {
  return (
    <p className={s.say} data-tone={tone} data-words>
      {text.split(' ').map((word, i) => (
        <span key={i} style={{ animationDelay: `${delay + i * 0.12}s` }}>
          {word}
        </span>
      ))}
    </p>
  )
}

/** A window in the game's own card style (BARELY BOOTED's boot window, the 404, the rack). */
function Window({
  title,
  tone,
  className = '',
  children,
}: {
  title: string
  tone: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`${s.win} ${className}`} data-tone={tone} data-words>
      <div className={s.winBar}>
        <i />
        <i />
        <i />
        <span>{title}</span>
      </div>
      {children}
    </div>
  )
}

interface SceneProps {
  title: TitleId
  stages: readonly StageRecord[]
  remainingMs: number
}

// ── SYSTEM SAVIOR: five arcs close into a ring, a check draws itself, the room turns green ──
const RING_R = 120
const RING_C = 2 * Math.PI * RING_R
/** Gap between two arcs, in px along the ring. */
const RING_GAP = 12
const ARC = RING_C / STAGE_COUNT - RING_GAP

function Savior({ remainingMs }: SceneProps) {
  return (
    <>
      <div className={s.dim} />
      <div className={`${s.heal} ${s.healLate}`} />
      <div className={s.restore} data-words>
        <svg viewBox="-160 -160 320 320" aria-hidden="true">
          <circle className={s.restoreTrack} r={RING_R} />
          {Array.from({ length: STAGE_COUNT }, (_, i) => (
            <circle
              key={i}
              className={s.restoreArc}
              r={RING_R}
              style={
                {
                  '--len': ARC,
                  strokeDasharray: `${ARC} ${RING_C}`,
                  // from twelve o'clock, one fifth each, half a gap in
                  rotate: `${-90 + i * (360 / STAGE_COUNT) + (RING_GAP / 2 / RING_C) * 360}deg`,
                  animationDelay: `${0.35 + i * 0.16}s`,
                } as never
              }
            />
          ))}
          <path className={s.check} d="M -46 2 L -14 34 L 50 -32" />
        </svg>
      </div>
      <div className={s.caption} data-words>
        <p className={s.captionTitle} data-tone="ok">
          SYSTEM RESTORED
        </p>
        <p className={s.captionLine}>5/5 modül temiz · {seconds(remainingMs)} sn kaldı</p>
      </div>
    </>
  )
}

// ── LAST SECOND HERO: the frozen screen, the seconds that were left beating like a heart; the
//    colour comes back from the clock outwards ──
function LastSecond({ remainingMs }: SceneProps) {
  const sec = seconds(remainingMs)
  return (
    <>
      <div className={`${s.freeze} ${s.thaw}`} />
      <div className={s.dimSoft} />
      <div className={s.heart} data-words>
        <i className={s.beat} />
        <i className={`${s.beat} ${s.beatLate}`} />
        <p className={s.heartLabel}>KALAN SÜRE</p>
        <p className={s.heartTime}>00:{String(sec).padStart(2, '0')}</p>
        <p className={s.heartStamp}>SON SANİYEDE KURTARILDI</p>
      </div>
    </>
  )
}

// ── ALL SYSTEMS GO: a rack panel, one status light per stage coming on in its colour ──
function AllSystems({ stages }: SceneProps) {
  return (
    <>
      <div className={s.dim} />
      <Window title="sistem durumu — 5 modül" tone="good" className={s.rack}>
        <ol className={s.bays}>
          {stages.map((r, i) => {
            const grade = stageGrade(r)
            return (
              <li key={r.slot} data-grade={grade} style={{ '--i': i } as never}>
                <i className={s.led} />
                <span>{STAGE_TEXT[r.stage].name}</span>
                <b>{GRADE_LABEL[grade]}</b>
              </li>
            )
          })}
        </ol>
        <p className={s.go}>ALL SYSTEMS GO</p>
      </Window>
    </>
  )
}

// ── ONE BUG LEFT: an inspector lens comes out of the one broken module and shows the bug ──
function OneBug({ stages }: SceneProps) {
  const bug = stages.find((r) => !isGreen(stageGrade(r)))
  return (
    <>
      <div className={s.spot} />
      <div className={s.bugMark} />
      <div className={s.lens} data-words>
        <svg
          className={s.lensBug}
          viewBox="0 0 11 10"
          aria-hidden="true"
          shapeRendering="crispEdges"
        >
          {/* a pixel-art bug: antennae, head, body, legs that wiggle */}
          <g className={s.legsA}>
            <rect x="0" y="3" width="2" height="1" />
            <rect x="9" y="3" width="2" height="1" />
            <rect x="0" y="7" width="2" height="1" />
            <rect x="9" y="7" width="2" height="1" />
          </g>
          <g className={s.legsB}>
            <rect x="0" y="5" width="2" height="1" />
            <rect x="9" y="5" width="2" height="1" />
          </g>
          <rect x="3" y="0" width="1" height="1" />
          <rect x="7" y="0" width="1" height="1" />
          <rect x="4" y="1" width="3" height="2" className={s.bugHead} />
          <rect x="2" y="3" width="7" height="6" />
          <rect x="5" y="3" width="1" height="6" className={s.bugSeam} />
        </svg>
      </div>
      {bug && (
        <p className={s.bugTag} data-words>
          <b>1 bug bulundu</b>
          <span>
            {STAGE_TEXT[bug.stage].name} · %{Math.round(stageShare(bug) * 100)}
          </span>
        </p>
      )}
    </>
  )
}

// ── BARELY BOOTED: a boot window opens over the dimmed screen and only just makes it ──
function Barely({ stages }: SceneProps) {
  const green = stages.filter((r) => isGreen(stageGrade(r))).length
  const lines: { text: string; status?: string; tone?: 'ok' | 'meh' }[] = [
    { text: 'KERNEL PANIC BIOS v0.4' },
    { text: 'Bellek testi', status: '640K OK', tone: 'ok' },
    { text: 'Modüller yükleniyor', status: `${green}/5`, tone: 'meh' },
    { text: 'Sürücüler', status: 'idare eder', tone: 'meh' },
  ]
  return (
    <>
      <div className={s.dim} />
      <div className={s.term} data-words>
        <div className={s.termBar}>
          <i />
          <i />
          <i />
          <span>boot — kernel-panic</span>
        </div>
        <div className={s.termBody}>
          {lines.map((line, i) => (
            <p key={line.text} style={{ animationDelay: `${0.5 + i * 0.26}s` }}>
              <span>{line.text}</span>
              {line.status && (
                <>
                  <span className={s.leader} />
                  <b data-tone={line.tone}>{line.status}</b>
                </>
              )}
            </p>
          ))}
          <p style={{ animationDelay: `${0.5 + lines.length * 0.26}s` }}>
            <span>&gt; Başlatılıyor</span>
            <span className={s.cursor} />
          </p>
          <div className={s.progress}>
            <div />
          </div>
        </div>
      </div>
    </>
  )
}

// ── SAFE MODE: the old boot menu; the bar slides down to "Güvenli Mod" and picks it ──
const BOOT_MENU = [
  'Windows... şaka. Normal başlat',
  'Güvenli Mod',
  'Güvenli Mod (ağ ile)',
  'Son bilinen iyi yapılandırma',
]

function Safe() {
  return (
    <>
      <div className={s.freeze} />
      <div className={s.dimSoft} />
      <div className={s.menu} data-words>
        <p className={s.menuTitle}>Gelişmiş Önyükleme Seçenekleri</p>
        <p className={s.menuSub}>Sistem tam açılamadı. Bir seçenek seçin:</p>
        <ul className={s.menuList}>
          <li className={s.menuBar} aria-hidden="true" />
          {BOOT_MENU.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className={s.menuKeys}>↑↓ seç · ENTER başlat</p>
      </div>
      <div className={s.safe} data-words>
        {['tl', 'tr', 'bl', 'br'].map((corner) => (
          <span key={corner} data-corner={corner}>
            Safe Mode
          </span>
        ))}
      </div>
    </>
  )
}

// ── ERROR 404: the rescue page cannot be found; the search for it finds nothing ──
function NotFound() {
  return (
    <>
      <div className={s.dim} />
      <Window title="sistem://kurtarma" tone="fail" className={s.page}>
        <p className={s.big404} aria-label="404">
          <span>4</span>
          <svg className={s.zero} viewBox="-50 -60 100 120" aria-hidden="true">
            <ellipse rx="34" ry="46" />
          </svg>
          <span>4</span>
        </p>
        <p className={s.pageLine}>Sistem bulunamadı</p>
        <p className={s.search}>
          <span className={s.searchText}>sistemi kurtar</span>
          <span className={s.searchCaret} />
        </p>
        <p className={s.noResult}>0 sonuç</p>
      </Window>
    </>
  )
}

// ── KERNEL PANIC: the kernel's last words scroll up, then the name of the game ──
function Panic({ stages }: SceneProps) {
  const lines = [
    '[    0.000000] Kernel panic - not syncing: Fatal exception',
    ...stages.map((r) => {
      const grade = stageGrade(r)
      const tag = grade === 'fail' ? 'FAIL' : isGreen(grade) ? ' OK ' : 'WARN'
      return `[ ${tag} ] ${STAGE_TEXT[r.stage].file}_0${r.slot}.ko  %${Math.round(stageShare(r) * 100)}`
    }),
    'CPU: 0 PID: 1 Comm: kurtarma Tainted: G   D',
    'Call Trace:',
    ' basma_dedik+0x1f/0x40',
    ' panik_butonu+0x0b/0x10',
    '---[ end Kernel panic - not syncing ]---',
  ]
  return (
    <>
      <div className={s.freeze} />
      <div className={s.blackout} />
      <div className={s.dump} data-words>
        {lines.map((line, i) => (
          <p
            key={line}
            data-tone={line.includes('FAIL') ? 'fail' : line.includes('WARN') ? 'warn' : undefined}
            style={{ animationDelay: `${0.25 + i * 0.09}s` }}
          >
            {line}
          </p>
        ))}
      </div>
      <div className={s.panicName} data-words>
        <i className={s.capsLed} />
        <p>KERNEL PANIC</p>
      </div>
    </>
  )
}

// ── ALMOST A LEGEND: the word LEGEND fills like a gauge — and stops just short ──
function Legend({ stages, remainingMs }: SceneProps) {
  const green = stages.filter((r) => isGreen(stageGrade(r))).length
  const fill = Math.min(0.9, Math.max(0.55, green / STAGE_COUNT - 0.08))
  return (
    <>
      <div className={s.dim} />
      <div className={s.legend} data-words style={{ '--fill': fill } as never}>
        <p className={s.legendWord} aria-label="LEGEND">
          <span className={s.legendOutline}>LEGEND</span>
          <span className={s.legendFill} aria-hidden="true">
            LEGEND
          </span>
          <i className={s.legendEdge} />
        </p>
        <p className={s.legendLine}>
          NEREDEYSE… <span>{seconds(remainingMs)} sn geç kaldın</span>
        </p>
      </div>
    </>
  )
}

// ── HAVE YOU TRIED…: the screen switches off like an old monitor (fx.css), the power button
//    fills its ring and the words of the oldest fix come one by one ──
function PowerCycle() {
  return (
    <>
      <div className={s.blackout} />
      <div className={s.power} data-words>
        <svg viewBox="-80 -80 160 160" aria-hidden="true">
          <circle className={s.powerTrack} r="70" />
          <circle className={s.powerRing} r="70" />
          <g className={s.powerIcon}>
            <path d="M 0 -34 V -2" />
            <path d="M -22 -24 A 32 32 0 1 0 22 -24" />
          </g>
        </svg>
      </div>
      <Say text="Kapat. Aç. Tekrar dene." delay={1.25} tone="cyan" />
    </>
  )
}

function Scene(props: SceneProps) {
  switch (props.title) {
    case 'system-savior':
      return <Savior {...props} />
    case 'last-second-hero':
      return <LastSecond {...props} />
    case 'all-systems-go':
      return <AllSystems {...props} />
    case 'one-bug-left':
      return <OneBug {...props} />
    case 'barely-booted':
      return <Barely {...props} />
    case 'safe-mode':
      return <Safe />
    case 'error-404':
      return <NotFound />
    case 'kernel-panic':
      return <Panic {...props} />
    case 'almost-a-legend':
      return <Legend {...props} />
    case 'turn-it-off-and-on':
      return <PowerCycle />
  }
}

/**
 * Lets every layer go on its own, from wherever its own animation has got to: the words and
 * windows first, blurring away, so they never sit on the result's text; the colour layers a
 * moment later, so the stage screen underneath has receded before its colours could return.
 * Web Animations, because they compose over the layers' CSS animations (a CSS transition does
 * not start on a property an animation holds — the layer would just vanish), and no wrapper
 * may fade them: that would isolate the blend layers into flat colour panels.
 */
function dissolve(root: HTMLElement, ms: number) {
  for (const layer of Array.from(root.children) as HTMLElement[]) {
    if (typeof layer.animate !== 'function') continue
    const words = layer.hasAttribute('data-words')
    layer.animate(words ? { opacity: 0, filter: 'blur(8px)' } : { opacity: 0 }, {
      duration: ms * (words ? 0.55 : 0.7),
      delay: words ? 0 : ms * 0.3,
      easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
      fill: 'forwards',
    })
  }
}

interface Props {
  title: TitleId
  mood: Mood
  stages: readonly StageRecord[]
  remainingMs: number
  /** 'half': one player's half of the duel (the scene zoomed to the half, see the CSS). */
  layout?: 'full' | 'half'
  /** Time for the result to appear underneath (the transition starts fading out). */
  onReveal: () => void
  onDone: () => void
}

export function ResultTransition({
  title,
  mood,
  stages,
  remainingMs,
  layout = 'full',
  onReveal,
  onDone,
}: Props) {
  const [leaving, setLeaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const reveal = useEffectEvent(onReveal)
  const done = useEffectEvent(onDone)
  useEffect(() => {
    playSfx(SOUND[title])
    const total = transitionMs(title)
    const fade = window.setTimeout(
      () => {
        if (ref.current) dissolve(ref.current, dur(TRANSITION_FADE_MS))
        setLeaving(true)
        reveal()
      },
      dur(total - TRANSITION_FADE_MS),
    )
    const end = window.setTimeout(() => done(), dur(total))
    return () => {
      window.clearTimeout(fade)
      window.clearTimeout(end)
    }
  }, [title])

  return (
    <div
      ref={ref}
      className={s.root}
      data-testid="result-transition"
      data-title={title}
      data-mood={mood}
      data-layout={layout}
      data-leaving={leaving}
      // a tap skips the animation (the queue at the booth)
      onPointerDown={() => {
        onReveal()
        onDone()
      }}
    >
      <Scene title={title} stages={stages} remainingMs={remainingMs} />
    </div>
  )
}
