import { useEffect } from 'react'
import { useIdle } from '@/app/useIdle'
import { usePressGuard } from '@/app/usePress'
import { playSfx } from '@/audio/sfx'
import { IntegrityCells } from '@/components/IntegrityCells'
import { STAGE_TEXT, TITLES } from '@/data/texts'
import { IDLE_RESET_MS } from '@/game/config'
import { duelPoints, duelWinner, formatPoints } from '@/game/duel'
import type { GameState } from '@/game/engine'
import { GRADE_LABEL, stageGrade } from '@/game/grades'
import { titleColour, titleFor } from '@/game/titles'
import s from './DuelResult.module.css'

interface Props {
  states: readonly [GameState, GameState]
  onRestart: () => void
}

const seconds = (ms: number) => Math.ceil(Math.abs(ms) / 1000)

/**
 * The duel's result (§2.5): both players side by side — their title, their five modules in
 * their grades' colours, the share of the system each saved — and the winner in the middle.
 * More saved wins; on equal points the one with more time left. No rematch (the queue).
 */
export function DuelResult({ states, onRestart }: Props) {
  const [a, b] = states
  const winner = duelWinner(a.outcome!, b.outcome!)
  const idle = useIdle(IDLE_RESET_MS, onRestart)
  const restart = usePressGuard(onRestart)

  useEffect(() => {
    const id = window.setTimeout(() => playSfx(winner === 'draw' ? 'correct' : 'success'), 900)
    return () => window.clearTimeout(id)
  }, [winner])

  return (
    <main className={s.root} data-testid="duel-result" data-winner={winner} {...idle}>
      <p className={s.kicker}>&gt; düello bitti</p>
      <h1 className={s.banner} data-testid="duel-winner">
        {winner === 'draw' ? 'BERABERE' : `OYUNCU ${winner + 1} KAZANDI`}
      </h1>

      <div className={s.columns}>
        {states.map((state, side) => {
          const outcome = state.outcome!
          const title = titleFor(outcome)
          const won = winner === side
          return (
            <section
              key={side}
              className={s.player}
              data-side={side + 1}
              data-won={won}
              data-lost={winner !== 'draw' && !won}
              data-colour={titleColour(title)}
              data-testid={`duel-player-${side + 1}`}
            >
              {won && (
                <span className={s.crown} aria-label="Kazanan">
                  ♛
                </span>
              )}
              <p className={s.tag}>
                <b>{side + 1}</b> OYUNCU {side + 1}
              </p>
              <p className={s.title}>{TITLES[title].title}</p>
              <p className={s.points} data-testid={`duel-points-${side + 1}`}>
                %{formatPoints(duelPoints(outcome))}
                <small>kurtarıldı</small>
              </p>
              <IntegrityCells stages={state.stages} current={-1} />
              <ol className={s.grades}>
                {state.stages.map((r) => (
                  <li key={r.slot} data-grade={stageGrade(r)}>
                    <span>{STAGE_TEXT[r.stage].name}</span>
                    <b>{GRADE_LABEL[stageGrade(r)]}</b>
                  </li>
                ))}
              </ol>
              <p className={s.time}>
                {outcome.remainingMs > 0
                  ? `${seconds(outcome.remainingMs)} sn kaldı`
                  : `süre aşımı +${seconds(outcome.remainingMs)} sn`}
              </p>
            </section>
          )
        })}
        <span className={s.versus} aria-hidden="true">
          VS
        </span>
      </div>

      <button type="button" className={s.home} data-testid="btn-restart" onClick={restart}>
        Ana ekran
      </button>
    </main>
  )
}
