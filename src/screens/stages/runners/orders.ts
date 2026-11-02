import { dur } from '@/app/timing'
import { playSfx } from '@/audio/sfx'
import { ORDERS } from '@/game/config'
import {
  COMMAND_TEXT,
  effectiveCommand,
  ringColourAt,
  windowOf,
  type Command,
  type Order,
} from '@/game/stages/orders'
import { StageRunner, type Mark, type StageIO } from '../runner'

export type PressPhase = 'wait' | 'reverse' | 'cmd' | 'ok' | 'miss' | 'done'

export interface PressView {
  idx: number
  phase: PressPhase
  order: Order | null
  eff: Command | null
  window: number
  marks: Mark[]
  why: string
  down: boolean
  deadline: number | null
}

/** What the ring shows on this frame: the share filled, and the traffic light colour. */
export interface RingFrame {
  progress: number
  colour: '' | 'r' | 'a' | 'g'
}

interface Cmd {
  order: Order
  eff: Command
  t0: number
  window: number
  taps: number
  /** BASILI TUT: when the finger went down (0 = not holding). */
  holdAt: number
  done: boolean
}

const fmt = (ms: number) => (ms / 1000).toFixed(1).replace('.', ',')

/**
 * BASMA DEDİK (the final): do what the command says — in TERS MOD the opposite. A missed
 * command only costs that command; all six are played.
 */
export class PressRunner extends StageRunner<PressView> {
  private idx = 0
  private phase: PressPhase = 'wait'
  private cmd: Cmd | null = null
  private marks: Mark[]
  private why = ''
  private down = false
  private deadline: number | null = null
  private timeout = 0

  readonly orders: readonly Order[]

  constructor(orders: readonly Order[], io: StageIO) {
    super(io)
    this.orders = orders
    this.marks = orders.map(() => 'idle')
    this.paint()
  }

  protected render(): PressView {
    return {
      idx: this.idx,
      phase: this.phase,
      order: this.cmd?.order ?? null,
      eff: this.cmd?.eff ?? null,
      window: this.cmd?.window ?? 1,
      marks: [...this.marks],
      why: this.why,
      down: this.down,
      deadline: this.deadline,
    }
  }

  start(): void {
    this.stop()
    this.marks = this.orders.map(() => 'idle')
    this.cmd = null
    this.issue(0)
  }

  press(): void {
    this.down = true
    this.paint()
    const cmd = this.cmd
    if (this.phase !== 'cmd' || !cmd || cmd.done) return
    playSfx('press')
    const t = Date.now() - cmd.t0
    if (cmd.eff === 'press') return this.resolve(true)
    if (cmd.eff === 'dontPress') return this.resolve(false, `${fmt(t)} sn'de bastın`)
    if (cmd.eff === 'triple') {
      cmd.taps++
      if (cmd.taps >= 3) this.resolve(true)
      return
    }
    if (cmd.eff === 'hold') {
      cmd.holdAt = Date.now()
      return
    }
    const colour = ringColourAt(t)
    if (colour === 'g') return this.resolve(true)
    this.resolve(false, colour === 'r' ? 'kırmızıda bastın' : 'sarıda bastın')
  }

  release(): void {
    if (this.down) {
      this.down = false
      this.paint()
    }
    const cmd = this.cmd
    if (!cmd || cmd.done || cmd.eff !== 'hold' || !cmd.holdAt) return
    const held = Date.now() - cmd.holdAt
    cmd.holdAt = 0
    // let go after the full hold, before a frame noticed it: still a hold
    if (held >= ORDERS.holdMs) return this.resolve(true)
    this.resolve(false, `${fmt(held)} sn'de bıraktın`)
  }

  /** Called every animation frame while a command runs: the ring, and the hold finishing. */
  frame(): RingFrame {
    const cmd = this.cmd
    if (!cmd || cmd.done) return { progress: 0, colour: '' }
    if (cmd.eff === 'hold') {
      const progress = cmd.holdAt ? Math.min(1, (Date.now() - cmd.holdAt) / ORDERS.holdMs) : 0
      if (cmd.holdAt && progress >= 1) this.resolve(true)
      return { progress, colour: '' }
    }
    if (cmd.order.kind === 'green')
      return { progress: 1, colour: ringColourAt(Date.now() - cmd.t0) }
    if (cmd.eff === 'triple') return { progress: cmd.taps / 3, colour: '' }
    return { progress: 0, colour: '' }
  }

  private issue(i: number): void {
    this.idx = i
    const order = this.orders[i]
    if (order.inverted && !this.orders[i - 1]?.inverted) {
      this.phase = 'reverse'
      this.cmd = null
      playSfx('alarm')
      this.paint()
      this.after(dur(1700), () => this.fire(i))
      return
    }
    this.fire(i)
  }

  private fire(i: number): void {
    const order = this.orders[i]
    const window = windowOf(order)
    const cmd: Cmd = {
      order,
      eff: effectiveCommand(order),
      t0: Date.now(),
      window,
      taps: 0,
      holdAt: 0,
      done: false,
    }
    this.cmd = cmd
    this.phase = 'cmd'
    this.marks[i] = 'now'
    this.deadline = cmd.t0 + window
    this.timeout = this.after(window, () => this.windowOver(cmd))
    this.io.hold(false)
    this.paint()
  }

  private windowOver(cmd: Cmd): void {
    if (cmd !== this.cmd || cmd.done || cmd.holdAt) return
    if (cmd.eff === 'dontPress') return this.resolve(true)
    const why =
      cmd.eff === 'triple'
        ? `${cmd.taps} kez bastın`
        : cmd.eff === 'green'
          ? 'yeşil yandı, basmadın'
          : cmd.eff === 'hold'
            ? 'basılı tutmadın'
            : cmd.order.inverted
              ? 'TERS modda basman gerekiyordu'
              : 'basmadın'
    this.resolve(false, why)
  }

  private resolve(ok: boolean, why = ''): void {
    const cmd = this.cmd
    if (!cmd || cmd.done) return
    cmd.done = true
    cmd.holdAt = 0
    this.cancel(this.timeout)
    this.deadline = null
    this.marks[this.idx] = ok ? 'ok' : 'miss'
    this.phase = ok ? 'ok' : 'miss'
    this.why = why
    this.io.hold(true)
    this.io.score(
      ok ? 1 : 0,
      ok ? 0 : 1,
      ok
        ? undefined
        : `${cmd.order.inverted ? 'TERS MOD · ' : ''}${COMMAND_TEXT[cmd.order.kind]} · ${why}`,
    )
    playSfx(ok ? 'correct' : 'wrong')
    this.paint()
    this.after(ok ? dur(600) : dur(1200), () => {
      if (this.idx + 1 < this.orders.length) return this.issue(this.idx + 1)
      this.phase = 'done'
      this.paint()
      this.io.done()
    })
  }
}
