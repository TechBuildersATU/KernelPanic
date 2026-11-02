import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useIdle } from '@/app/useIdle'
import { usePressGuard } from '@/app/usePress'
import { playSfx } from '@/audio/sfx'
import { IntegrityCells } from '@/components/IntegrityCells'
import { TITLES } from '@/data/texts'
import { STAGE_TEXT } from '@/data/texts'
import { IDLE_RESET_MS } from '@/game/config'
import type { GameState } from '@/game/engine'
import { moodOf } from '@/game/events'
import { ResultTransition } from '@/fx/ResultTransition'
import { GRADE_LABEL, stageGrade } from '@/game/grades'
import { titleColour, titleFor, toneOf } from '@/game/titles'
import type { EventKind } from '@/game/types'
import s from './Result.module.css'

/** Counts up from 0 to `to` in about a dozen ticks (the numbers on the result screen). */
function useCountUp(to: number, delayMs: number): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (value >= to) return
    const step = Math.max(1, Math.ceil(to / 12))
    const id = window.setTimeout(
      () => setValue((v) => Math.min(to, v + step)),
      value === 0 ? delayMs : 90,
    )
    return () => window.clearTimeout(id)
  }, [value, to, delayMs])
  return value
}

/** Survived events, shown as badges (§5.2). */
const BADGES: Record<EventKind, string> = {
  overheat: 'Aşırı ısınmayı atlattın',
  glitch: "Glitch'ten sağ çıktın",
  emergency: 'Acil durumu yönettin',
  power: 'Enerjiyi geri getirdin',
}

interface Props {
  state: GameState
  /** Play the transition first (once per round; not again when coming back from the report). */
  intro: boolean
  /** The transition starts to fade: the question screen underneath recedes (App). */
  onReveal: () => void
  onIntroDone: () => void
  onReport: () => void
  onRestart: () => void
}

/**
 * Result (§5): the transition for this title plays over the round's stage screen, then fades
 * out over the result underneath (no hard cut): the title, the five modules in their grade
 * colours and the step counts. No leaderboard.
 */
export function Result({ state, intro, onReveal, onIntroDone, onReport, onRestart }: Props) {
  const titleId = titleFor(state.outcome!)
  const tone = toneOf(titleId)
  const [revealed, setRevealed] = useState(!intro)
  return (
    <main
      className={s.root}
      data-testid="result"
      data-title={titleId}
      data-tone={tone}
      data-colour={titleColour(titleId)}
    >
      {(revealed || !intro) && (
        <ResultBody state={state} onReport={onReport} onRestart={onRestart} />
      )}
      {intro && (
        <ResultTransition
          title={titleId}
          mood={moodOf(state.events)}
          stages={state.stages}
          remainingMs={state.outcome!.remainingMs}
          onReveal={() => {
            setRevealed(true)
            onReveal()
          }}
          onDone={onIntroDone}
        />
      )}
    </main>
  )
}

/**
 * The five modules fly out of the stage screen's small HUD cells into their big places (FLIP):
 * measured before the first paint, played back with the Web Animations API. Only when the stage
 * screen is still underneath (the end of a round, not back from the report).
 */
function useCellsFlyIn(body: React.RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const root = body.current
    const ending = root?.closest('.ending')
    const stage = root?.closest('[data-stage]')
    if (!root || !ending || !stage) return
    const from = ending.querySelectorAll<HTMLElement>('[data-testid="play"] [data-cell]')
    const to = root.querySelectorAll<HTMLElement>('[data-cell]')
    if (from.length !== to.length || to.length === 0 || typeof to[0].animate !== 'function') return
    const scale = stage.getBoundingClientRect().width / 1280 || 1
    const list = to[0].parentElement!
    list.dataset.flying = ''
    const animations = Array.from(to, (cell, i) => {
      const a = from[i].getBoundingClientRect()
      const b = cell.getBoundingClientRect()
      const dx = (a.left + a.width / 2 - (b.left + b.width / 2)) / scale
      const dy = (a.top + a.height / 2 - (b.top + b.height / 2)) / scale
      return cell.animate(
        [
          {
            transform: `translate(${dx}px, ${dy}px) scale(${a.width / b.width}, ${a.height / b.height})`,
          },
          { transform: 'none' },
        ],
        {
          duration: 1000,
          delay: i * 70,
          easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
          fill: 'backwards',
        },
      )
    })
    return () => animations.forEach((a) => a.cancel())
  }, [body])
}

function ResultBody({
  state,
  onReport,
  onRestart,
}: Omit<Props, 'intro' | 'onIntroDone' | 'onReveal'>) {
  const outcome = state.outcome!
  const titleId = titleFor(outcome)
  const tone = toneOf(titleId)
  const text = TITLES[titleId]
  const correct = state.stages.reduce((sum, r) => sum + r.ok, 0)
  const wrong = state.stages.reduce((sum, r) => sum + r.miss, 0)
  const overtime = outcome.remainingMs <= 0
  const shownCorrect = useCountUp(correct, 900)
  const shownWrong = useCountUp(wrong, 900)
  const idle = useIdle(IDLE_RESET_MS, onRestart)
  const restart = usePressGuard(onRestart)
  const report = usePressGuard(onReport)
  const ref = useRef<HTMLDivElement>(null)
  useCellsFlyIn(ref)

  useEffect(() => {
    // the crash already sounded during the transition
    if (tone !== 'crash') playSfx(tone === 'good' ? 'success' : 'correct')
  }, [tone])

  return (
    <div ref={ref} className={s.body} {...idle}>
      <p className={s.kicker}>
        {overtime ? '> süre doldu: sistem geç kurtarıldı' : '> sistem yeniden başlatıldı'}
      </p>
      <h1 className={s.title} data-testid="result-title" data-long={text.title.length > 20}>
        {text.title}
      </h1>
      <p className={s.line}>{text.line}</p>

      <IntegrityCells stages={state.stages} current={-1} size="large" />
      <ol className={s.captions} aria-hidden="true">
        {state.stages.map((r) => {
          const grade = stageGrade(r)
          return (
            <li key={r.slot} data-grade={grade} data-testid={`caption-${r.slot}`}>
              <span>{STAGE_TEXT[r.stage].name}</span>
              <b>
                {r.ok}/{r.ok + r.miss} · {GRADE_LABEL[grade]}
              </b>
            </li>
          )
        })}
      </ol>

      <dl className={s.counts}>
        <div className={s.count} data-kind="ok">
          <dt>Doğru adım</dt>
          <dd data-testid="count-correct" data-done={shownCorrect === correct}>
            {shownCorrect}
          </dd>
        </div>
        <div className={s.count} data-kind="bad">
          <dt>Hatalı adım</dt>
          <dd data-testid="count-wrong" data-done={shownWrong === wrong}>
            {shownWrong}
          </dd>
        </div>
        <div className={s.count} data-kind="time">
          <dt>{overtime ? 'Süre aşımı' : 'Kalan süre'}</dt>
          <dd data-testid="count-time" data-over={overtime}>
            {overtime ? '+' : ''}
            {Math.ceil(Math.abs(outcome.remainingMs) / 1000)}
            <small className={s.unit}>sn</small>
          </dd>
        </div>
      </dl>

      {state.events.length > 0 && (
        <ul className={s.badges} aria-label="Atlatılan olaylar">
          {[...new Set(state.events)].map((kind) => (
            <li key={kind} className={s.badge} data-kind={kind} data-testid={`badge-${kind}`}>
              {BADGES[kind]}
            </li>
          ))}
        </ul>
      )}

      <div className={s.actions}>
        {wrong > 0 ? (
          <button type="button" className={s.secondary} data-testid="btn-report" onClick={report}>
            Hata raporunu aç
          </button>
        ) : (
          <p className={s.clean} data-testid="clean-log">
            0 hata. Log tertemiz.
          </p>
        )}
        <button type="button" className={s.primary} data-testid="btn-restart" onClick={restart}>
          Yeniden başlat
        </button>
      </div>
    </div>
  )
}
