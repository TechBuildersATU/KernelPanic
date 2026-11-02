import { STAGE_TEXT } from '@/data/texts'
import { STAGE_ORDER } from '@/game/config'
import { GRADE_LABEL, stageGrade } from '@/game/grades'
import type { StageRecord } from '@/game/types'
import s from './IntegrityCells.module.css'

/**
 * Five memory blocks, one per stage, in the stage's grade colour once it is over — green, lime,
 * orange or red — and the current one outlined (§2.3, §5.2).
 */
export function IntegrityCells({
  stages,
  current,
  size = 'small',
}: {
  stages: readonly StageRecord[]
  /** Index of the stage on screen, or -1 when the round is over. */
  current: number
  size?: 'small' | 'large'
}) {
  return (
    <ol className={s.cells} data-size={size} aria-label="Sistem modülleri">
      {STAGE_ORDER.map((id, i) => {
        const record = stages.find((r) => r.slot === i + 1)
        const grade = record ? stageGrade(record) : null
        const state = grade ?? (i === current ? 'now' : 'idle')
        return (
          <li
            key={id}
            className={s.cell}
            data-state={state}
            data-cell={i + 1}
            style={{ '--i': i } as never}
          >
            <span className={s.label}>
              {STAGE_TEXT[id].name}: {grade ? GRADE_LABEL[grade] : 'bekliyor'}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
