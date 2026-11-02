import { LEGEND_MIN_GREEN, SAVIOR_MIN_REMAINING_RATIO, STAGE_COUNT } from './config'
import { isGreen, stageGrade } from './grades'
import type { Grade, RoundOutcome, TitleId } from './types'

/**
 * The result title of a round (docs/ROADMAP.md §5.1), from the colours of the five stages:
 * how many are green (perfect or lime), how many red, and whether the clock held.
 */
export function titleFor({ stages, remainingMs, roundMs }: RoundOutcome): TitleId {
  const grades = stages.map(stageGrade)
  const count = (grade: Grade) => grades.filter((g) => g === grade).length
  const green = grades.filter(isGreen).length
  const red = count('fail')

  if (remainingMs <= 0) {
    return green >= LEGEND_MIN_GREEN ? 'almost-a-legend' : 'turn-it-off-and-on'
  }
  if (count('perfect') === STAGE_COUNT) {
    return remainingMs >= roundMs * SAVIOR_MIN_REMAINING_RATIO
      ? 'system-savior'
      : 'last-second-hero'
  }
  if (green === STAGE_COUNT) return 'all-systems-go'
  if (green === STAGE_COUNT - 1) return 'one-bug-left'
  if (red === 0) return 'barely-booted'
  if (red <= 2) return 'safe-mode'
  if (red < STAGE_COUNT) return 'error-404'
  return 'kernel-panic'
}

/** How a title feels: the result's music and room light (§5). */
export type Tone = 'good' | 'close' | 'crash'

const TONES: Record<TitleId, Tone> = {
  'system-savior': 'good',
  'last-second-hero': 'good',
  'all-systems-go': 'good',
  'one-bug-left': 'good',
  'barely-booted': 'close',
  'safe-mode': 'close',
  'almost-a-legend': 'close',
  'error-404': 'crash',
  'kernel-panic': 'crash',
  'turn-it-off-and-on': 'crash',
}

export function toneOf(title: TitleId): Tone {
  return TONES[title]
}

/** The colour of the title on the result, in the stages' own colour scale. */
const COLOURS: Record<TitleId, Grade> = {
  'system-savior': 'perfect',
  'last-second-hero': 'perfect',
  'all-systems-go': 'good',
  'one-bug-left': 'good',
  'barely-booted': 'pass',
  'safe-mode': 'pass',
  'almost-a-legend': 'pass',
  'error-404': 'fail',
  'kernel-panic': 'fail',
  'turn-it-off-and-on': 'fail',
}

export function titleColour(title: TitleId): Grade {
  return COLOURS[title]
}
