import { dur } from '@/app/timing'
import { playSfx } from '@/audio/sfx'
import { PIXEL } from '@/game/config'
import type { PixelScreen } from '@/game/stages/pixel'
import { StageRunner, type Mark, type StageIO } from '../runner'

export type PixelPhase = 'wait' | 'find' | 'hit' | 'reveal' | 'done'

export interface PixelView {
  screen: number
  phase: PixelPhase
  deadline: number | null
  marks: Mark[]
  /** The last wrong pixel nudges (alternating names restart its animation). */
  nudge: { cell: number; flip: boolean } | null
  /** Key of the "−2 sn" label (0 = none yet). */
  penalty: number
}

/**
 * ÖLÜ PİKSEL: five screens, each with its own clock; a wrong square takes two seconds off it.
 * When the clock runs out the dead pixel is shown, then the next screen comes.
 */
export class PixelRunner extends StageRunner<PixelView> {
  private screen = 0
  private phase: PixelPhase = 'wait'
  private deadline: number | null = null
  private timeout = 0
  private results: ('ok' | 'miss')[] = []
  private wrong = 0
  private nudge: PixelView['nudge'] = null
  private penalty = 0

  readonly screens: readonly PixelScreen[]

  constructor(screens: readonly PixelScreen[], io: StageIO) {
    super(io)
    this.screens = screens
    this.paint()
  }

  protected render(): PixelView {
    return {
      screen: this.screen,
      phase: this.phase,
      deadline: this.deadline,
      marks: this.screens.map(
        (_, i) => this.results[i] ?? (i === this.screen && this.phase !== 'wait' ? 'now' : 'idle'),
      ),
      nudge: this.nudge,
      penalty: this.penalty,
    }
  }

  start(): void {
    this.stop()
    this.results = []
    this.penalty = 0
    this.begin(0)
  }

  tap(cell: number): void {
    if (this.phase !== 'find' || this.deadline === null) return
    if (cell === this.screens[this.screen].odd) {
      this.cancel(this.timeout)
      this.phase = 'hit'
      this.deadline = null
      this.results[this.screen] = 'ok'
      this.io.hold(true)
      this.io.score(
        1,
        0,
        this.wrong ? `${this.screen + 1}. ekran · ${this.wrong} yanlış kare` : undefined,
      )
      playSfx('correct')
      this.paint()
      this.after(dur(600), () => this.next())
      return
    }
    this.wrong++
    this.nudge = { cell, flip: !this.nudge?.flip }
    this.penalty++
    this.deadline -= PIXEL.wrongPenaltyMs
    playSfx('miss')
    this.cancel(this.timeout)
    if (this.deadline <= Date.now()) return this.expire()
    this.timeout = this.after(this.deadline - Date.now(), () => this.expire())
    this.paint()
  }

  private begin(i: number): void {
    const limit = this.screens[i].limitMs
    this.screen = i
    this.phase = 'find'
    this.wrong = 0
    this.nudge = null
    this.deadline = Date.now() + limit
    this.timeout = this.after(limit, () => this.expire())
    this.io.hold(false)
    this.paint()
  }

  private next(): void {
    if (this.screen + 1 < this.screens.length) return this.begin(this.screen + 1)
    this.phase = 'done'
    this.paint()
    this.io.done()
  }

  private expire(): void {
    if (this.phase !== 'find') return
    this.phase = 'reveal'
    this.deadline = null
    this.results[this.screen] = 'miss'
    this.io.hold(true)
    this.io.score(0, 1, `${this.screen + 1}. ekran · süre bitti`)
    playSfx('wrong')
    this.paint()
    this.after(dur(PIXEL.revealMs), () => this.next())
  }
}
