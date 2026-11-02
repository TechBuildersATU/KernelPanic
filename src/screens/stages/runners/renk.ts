import { dur } from '@/app/timing'
import { playSfx, type Sfx } from '@/audio/sfx'
import { RENK } from '@/game/config'
import type { Rng } from '@/game/rng'
import { derange, PADS, type ColourLayer } from '@/game/stages/renk'
import { StageRunner, type Mark, type StageIO } from '../runner'

export type ColourPhase = 'wait' | 'show' | 'swap' | 'input' | 'pass' | 'fail' | 'done'

export interface ColourView {
  layer: number
  phase: ColourPhase
  /** order[pad] = its place on the 2×2 board (pads trade places). */
  order: number[]
  lit: number | null
  /** The pad tapped wrong (red ring) while the right one lights. */
  wrong: number | null
  /** Colours still to tap, in order (test builds expose it). */
  rest: number[]
  marks: Mark[]
  deadline: number | null
}

const NOTES: Sfx[] = ['pad0', 'pad1', 'pad2', 'pad3']

/**
 * DÖRT RENK: three layers to repeat; a wrong colour (or waiting too long) shows the right pad
 * and ends that layer, its colours still to come count as missed — the next layer still comes.
 */
export class ColourRunner extends StageRunner<ColourView> {
  private layer = 0
  private phase: ColourPhase = 'wait'
  private order = [0, 1, 2, 3]
  private lit: number | null = null
  private wrong: number | null = null
  private step = 0
  private marks: Mark[]
  private deadline: number | null = null
  private idle = 0

  readonly layers: readonly ColourLayer[]
  private readonly swapRng: Rng

  constructor(layers: readonly ColourLayer[], swapRng: Rng, io: StageIO) {
    super(io)
    this.layers = layers
    this.swapRng = swapRng
    this.marks = layers[0].seq.map(() => 'idle')
    this.paint()
  }

  protected render(): ColourView {
    const seq = this.layers[this.layer].seq
    return {
      layer: this.layer,
      phase: this.phase,
      order: [...this.order],
      lit: this.lit,
      wrong: this.wrong,
      rest: this.phase === 'input' ? seq.slice(this.step) : [],
      marks: [...this.marks],
      deadline: this.deadline,
    }
  }

  start(): void {
    this.stop()
    this.order = [0, 1, 2, 3]
    this.startLayer(0)
  }

  tap(pad: number): void {
    if (this.phase !== 'input') return
    const seq = this.layers[this.layer].seq
    if (pad !== seq[this.step]) return this.fail(pad)
    this.light(pad, 220)
    this.marks[this.step] = 'ok'
    this.step++
    this.io.score(1, 0)
    if (this.step < seq.length) {
      this.marks[this.step] = 'now'
      this.armIdle()
      this.paint()
      return
    }
    this.cancel(this.idle)
    this.phase = 'pass'
    this.deadline = null
    this.io.hold(true)
    this.after(dur(250), () => playSfx('up'))
    this.after(dur(1000), () => this.afterLayer())
    this.paint()
  }

  private light(pad: number, ms: number): void {
    this.lit = pad
    playSfx(NOTES[pad])
    this.paint()
    this.after(ms, () => {
      if (this.lit === pad) this.lit = null
      this.paint()
    })
  }

  private startLayer(i: number): void {
    const layer = this.layers[i]
    this.layer = i
    this.phase = 'show'
    this.step = 0
    this.wrong = null
    this.deadline = null
    this.marks = layer.seq.map(() => 'idle')
    this.io.hold(true)
    this.paint()
    const gap = dur(RENK.gapMs)
    const on = dur(layer.onMs)
    const lead = dur(600)
    layer.seq.forEach((pad, n) => {
      this.after(lead + n * (on + gap), () => {
        this.marks = layer.seq.map((_, j) => (j === n ? 'now' : 'idle'))
        this.light(pad, on)
      })
    })
    const shown = lead + layer.seq.length * (on + gap)
    if (layer.swap) {
      this.after(shown + dur(150), () => {
        this.order = derange(this.order, this.swapRng)
        this.phase = 'swap'
        playSfx('whoosh')
        this.paint()
      })
    }
    this.after(shown + (layer.swap ? dur(1100) : dur(250)), () => {
      this.phase = 'input'
      this.marks = layer.seq.map((_, j) => (j === 0 ? 'now' : 'idle'))
      this.io.hold(false)
      this.armIdle()
      this.paint()
    })
  }

  private armIdle(): void {
    this.cancel(this.idle)
    this.deadline = Date.now() + RENK.idleMs
    this.idle = this.after(RENK.idleMs, () => this.fail(null))
  }

  private afterLayer(): void {
    if (this.layer + 1 < this.layers.length) return this.startLayer(this.layer + 1)
    this.phase = 'done'
    this.paint()
    this.io.done()
  }

  /** The layer breaks: the right pad lights, the colours still to come count as missed. */
  private fail(tapped: number | null): void {
    if (this.phase !== 'input') return
    const seq = this.layers[this.layer].seq
    const right = seq[this.step]
    const where = `katman ${this.layer + 1}`
    this.cancel(this.idle)
    this.phase = 'fail'
    this.deadline = null
    this.wrong = tapped
    this.marks = seq.map((_, j) => (j < this.step ? 'ok' : 'miss'))
    this.io.hold(true)
    this.io.score(
      0,
      seq.length - this.step,
      tapped === null
        ? `${where} · ${this.step}/${seq.length} renk, sonra durdun`
        : `${where} · ${this.step + 1}. renkte ${PADS[tapped].name}, doğrusu ${PADS[right].name}`,
    )
    playSfx('wrong')
    this.after(dur(450), () => this.light(right, dur(700)))
    this.after(dur(1600), () => this.afterLayer())
    this.paint()
  }
}
