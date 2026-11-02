import { useIdle } from '@/app/useIdle'
import { usePressGuard } from '@/app/usePress'
import { STAGE_TEXT } from '@/data/texts'
import { IDLE_RESET_MS } from '@/game/config'
import type { GameState } from '@/game/engine'
import { GRADE_LABEL, stageGrade, stageShare } from '@/game/grades'
import s from './Report.module.css'

/** Report lines shown per stage (the screen never scrolls). */
const LINES_PER_STAGE = 2

interface Props {
  state: GameState
  onBack: () => void
  onRestart: () => void
}

/** Error report (§6): every stage with a miss — its grade, its score and what went wrong. */
export function Report({ state, onBack, onRestart }: Props) {
  const rows = state.stages.filter((r) => r.miss > 0)
  const misses = rows.reduce((sum, r) => sum + r.miss, 0)
  const idle = useIdle(IDLE_RESET_MS, onRestart)
  const back = usePressGuard(onBack)
  const restart = usePressGuard(onRestart)

  return (
    <main className={s.root} data-testid="report" {...idle}>
      <h1 className={s.heading}>
        HATA RAPORU <span className={s.count}>{misses} hatalı adım</span>
      </h1>

      <ol className={s.rows}>
        {rows.map((r) => {
          const grade = stageGrade(r)
          const extra = r.notes.length - LINES_PER_STAGE
          return (
            <li
              key={r.slot}
              className={s.row}
              data-grade={grade}
              data-testid={`report-row-${r.slot}`}
            >
              <span className={s.slot}>AŞAMA {r.slot}</span>
              <span className={s.stage}>{STAGE_TEXT[r.stage].name}</span>
              <span className={s.grade} data-testid={`report-grade-${r.slot}`}>
                {r.ok}/{r.ok + r.miss} · %{Math.round(stageShare(r) * 100)} · {GRADE_LABEL[grade]}
              </span>
              <ul className={s.notes}>
                {r.notes.slice(0, LINES_PER_STAGE).map((note) => (
                  <li key={note}>{note}</li>
                ))}
                {extra > 0 && <li className={s.more}>… {extra} kayıt daha</li>}
              </ul>
            </li>
          )
        })}
      </ol>

      <div className={s.actions}>
        <button type="button" className={s.secondary} data-testid="btn-back" onClick={back}>
          Sonuca dön
        </button>
        <button type="button" className={s.primary} data-testid="btn-restart" onClick={restart}>
          Yeniden başlat
        </button>
      </div>
    </main>
  )
}
