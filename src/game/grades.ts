import { GRADE_GOOD_ABOVE, GRADE_PASS_FROM } from './config'
import type { Grade, StageRecord } from './types'

// The colour of a stage (docs/ROADMAP.md §5.1): every stage is played to its end and then
// graded by its share of right steps — all right is green, more than 75 % lime, 50–75 % orange,
// less than half red.

export function gradeOf(ok: number, total: number): Grade {
  if (total <= 0) return 'fail'
  const share = ok / total
  if (share >= 1) return 'perfect'
  if (share > GRADE_GOOD_ABOVE) return 'good'
  if (share >= GRADE_PASS_FROM) return 'pass'
  return 'fail'
}

export function stageGrade(record: StageRecord): Grade {
  return gradeOf(record.ok, record.ok + record.miss)
}

/** Share of right steps, 0–1. */
export function stageShare(record: StageRecord): number {
  const total = record.ok + record.miss
  return total > 0 ? record.ok / total : 0
}

/** Green and lime both count as "the module is up" (Power Restored, the titles). */
export function isGreen(grade: Grade): boolean {
  return grade === 'perfect' || grade === 'good'
}

/** Short Turkish label of a grade (stage card, result, report). */
export const GRADE_LABEL: Readonly<Record<Grade, string>> = {
  perfect: 'TEMİZ',
  good: 'İYİ',
  pass: 'SINIRDA',
  fail: 'BOZUK',
}
