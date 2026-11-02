import { useEffect, useRef } from 'react'
import type { Mark, Tone } from './runner'
import s from './Stage.module.css'

// Shared pieces of the five stage games' side panels: the step clock, the step dots, the level.

/**
 * The step's own clock: a bar that drains until `deadline` and stays where it stopped once the
 * step is over (`deadline` null). A new step refills it softly.
 */
export function StepTimer({ deadline, total }: { deadline: number | null; total: number }) {
  const fill = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = fill.current
    if (!el || deadline === null) return
    const share = () => Math.max(0, Math.min(1, (deadline - Date.now()) / total))
    const refillUntil = Date.now() + 280
    el.style.transition = 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.3s'
    el.style.transform = `scaleX(${Math.max(0, share() - 280 / total)})`
    let raf = 0
    const tick = () => {
      if (Date.now() >= refillUntil) {
        el.style.transition = 'background-color 0.3s'
        el.style.transform = `scaleX(${share()})`
      }
      el.dataset.low = String(share() < 0.3)
      if (share() > 0) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [deadline, total])
  return (
    <div className={s.stepTimer} data-testid="step-timer" data-running={deadline !== null}>
      <div ref={fill} className={s.stepFill} />
    </div>
  )
}

/** One dot per step: done right, missed, on now, still to come. */
export function Dots({ marks, label }: { marks: readonly Mark[]; label: string }) {
  return (
    <ol className={s.dots} aria-label={label}>
      {marks.map((mark, i) => (
        <li key={i} data-mark={mark} />
      ))}
    </ol>
  )
}

/** "EKRAN 2/3 · orta" on the side panel. */
export function Level({
  label,
  index,
  total,
  tag,
  tone,
}: {
  label: string
  index: number
  total: number
  tag: string
  tone: Tone
}) {
  return (
    <p className={s.level} data-testid="stage-level">
      {label}
      <b key={index}>
        {index + 1}/{total}
      </b>
      <span data-tone={tone}>{tag}</span>
    </p>
  )
}

/** The status line of a game ("izle", "şimdi sen"); its words change softly. */
export function Say({ text, tone }: { text: string; tone: string }) {
  return (
    <p className={s.say} data-tone={tone} aria-live="polite">
      <span key={text}>{text}</span>
    </p>
  )
}
