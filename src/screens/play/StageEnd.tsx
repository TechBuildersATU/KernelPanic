import { useEffect } from 'react'
import { dur } from '@/app/timing'
import { playSfx } from '@/audio/sfx'
import { STAGE_TEXT } from '@/data/texts'
import { GRADE_PASS_FROM, GRADE_GOOD_ABOVE, STAGE_COUNT } from '@/game/config'
import { GRADE_LABEL, stageGrade, stageShare } from '@/game/grades'
import type { StageRecord } from '@/game/types'
import s from './StageEnd.module.css'

/**
 * The stage's grade (§5.1): a meter fills along the colour scale — red, orange from 50 %, lime
 * above 75 %, green at 100 % — and stops at the share of right steps; the grade lands in its
 * colour, and so does the module cell in the HUD.
 */
export function StageEnd({ record }: { record: StageRecord }) {
  const grade = stageGrade(record)
  const share = stageShare(record)
  const total = record.ok + record.miss
  useEffect(() => {
    const id = window.setTimeout(() => playSfx('grade'), dur(700))
    return () => window.clearTimeout(id)
  }, [])

  return (
    <section
      className={s.root}
      data-grade={grade}
      data-testid="stage-end"
      style={{ '--share': share } as never}
    >
      <p className={s.kicker}>
        AŞAMA {record.slot}/{STAGE_COUNT} · {STAGE_TEXT[record.stage].name.toLocaleUpperCase('tr')}
      </p>
      <div className={s.meter} aria-hidden="true">
        <div className={s.scale} />
        <div className={s.fill} />
        <i className={s.tick} style={{ left: `${GRADE_PASS_FROM * 100}%` }} />
        <i className={s.tick} style={{ left: `${GRADE_GOOD_ABOVE * 100}%` }} />
        <div className={s.knob} />
      </div>
      <p className={s.grade} data-testid="stage-grade" data-grade={grade}>
        {GRADE_LABEL[grade]}
      </p>
      <p className={s.score} data-testid="stage-score">
        {record.ok}/{total} {STAGE_TEXT[record.stage].step} doğru · %{Math.round(share * 100)}
      </p>
    </section>
  )
}
