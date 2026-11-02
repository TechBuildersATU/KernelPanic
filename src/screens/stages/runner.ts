import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { Player } from '@/game/stages/players'

// The five stage games share this frame: their logic lives in a small class (a runner) that
// owns its timers and publishes an immutable view after every change; the React component
// only draws the view and forwards taps. The runner talks to the round through `StageIO`.

export interface StageProps {
  /** The round's content seed: the stage builds its screens from it. */
  seed: number
  /** Solo (0) or one of the duel's players: same stage, other answers (game/stages/players). */
  player: Player
  glitch: boolean
  /** The title card has gone: the stage runs. */
  live: boolean
  /** The player only watches (true) or plays (false): the round clock follows. */
  onHold: (on: boolean) => void
  /** One or more steps went right (ok) or wrong (miss); `note` goes into the error report. */
  onScore: (ok: number, miss: number, note?: string) => void
  /** Every step has been played. */
  onDone: () => void
}

export interface StageIO {
  hold(on: boolean): void
  score(ok: number, miss: number, note?: string): void
  done(): void
}

export abstract class StageRunner<V> {
  private readonly listeners = new Set<() => void>()
  private readonly timers = new Set<number>()
  private view!: V

  protected readonly io: StageIO

  constructor(io: StageIO) {
    this.io = io
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly snapshot = (): V => this.view

  /** Starts from the first step (again: StrictMode starts every effect twice). */
  abstract start(): void

  /** Stops every timer (the screen unmounts or the stage is over). */
  stop(): void {
    this.timers.forEach((id) => window.clearTimeout(id))
    this.timers.clear()
  }

  protected abstract render(): V

  /** Publishes a new view; subclasses call it at the end of their constructor too. */
  protected paint(): void {
    this.view = this.render()
    this.listeners.forEach((listener) => listener())
  }

  protected after(ms: number, fn: () => void): number {
    const id = window.setTimeout(
      () => {
        this.timers.delete(id)
        fn()
      },
      Math.max(0, ms),
    )
    this.timers.add(id)
    return id
  }

  protected cancel(id: number): void {
    window.clearTimeout(id)
    this.timers.delete(id)
  }
}

type ViewOf<R> = R extends StageRunner<infer V> ? V : never

/** A stable StageIO that always calls the latest props. */
function useStageIO(props: StageProps): StageIO {
  const latest = useRef(props)
  useLayoutEffect(() => {
    latest.current = props
  })
  const [io] = useState<StageIO>(() => ({
    hold: (on) => latest.current.onHold(on),
    score: (ok, miss, note) => latest.current.onScore(ok, miss, note),
    done: () => latest.current.onDone(),
  }))
  return io
}

/**
 * Creates the stage's runner once, draws its view and starts it when the title card has gone.
 * The host is keyed per stage, so the props the runner is made from never change.
 */
export function useRunner<R extends StageRunner<unknown>>(
  props: StageProps,
  create: (io: StageIO) => R,
): [R, ViewOf<R>] {
  const io = useStageIO(props)
  const [runner] = useState(() => create(io))
  const view = useSyncExternalStore(runner.subscribe, runner.snapshot) as ViewOf<R>
  useEffect(() => {
    if (!props.live) return
    runner.start()
    return () => runner.stop()
  }, [props.live, runner])
  return [runner, view]
}

export type Mark = 'ok' | 'miss' | 'now' | 'idle'
export type Tone = 'easy' | 'mid' | 'hard'
export const TONES: readonly Tone[] = ['easy', 'mid', 'hard']
