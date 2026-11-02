import { dur } from '@/app/timing'
import { playSfx } from '@/audio/sfx'
import { shuffle, type Rng } from '@/game/rng'
import { INKS, type TrapItem } from '@/game/stages/tuzak'
import { StageRunner, type Mark, type StageIO } from '../runner'

export type TrapPhase = 'wait' | 'answer' | 'right' | 'wrong' | 'warn' | 'done'

export interface TrapView {
  item: number
  phase: TrapPhase
  /** order[colour] = its place in the row of buttons (they trade places). */
  order: number[]
  /** Which rule the pill shows (it turns over after the warning). */
  rule: 0 | 1
  picked: number | null
  marks: Mark[]
  deadline: number | null
}

/**
 * RENK TUZAĞI: first tap the colour the word says, then — after the warning — the colour it is
 * painted in. Each word has its own clock; a wrong tap or running out shows the right button
 * and the next word comes. Glitch: the buttons trade places after every answer.
 */
export class TrapRunner extends StageRunner<TrapView> {
  private item = 0
  private phase: TrapPhase = 'wait'
  private order = [0, 1, 2, 3]
  private rule: 0 | 1 = 0
  private picked: number | null = null
  private marks: Mark[]
  private deadline: number | null = null
  private timeout = 0

  readonly items: readonly TrapItem[]
  readonly limitMs: number
  private readonly glitch: boolean
  private readonly shuffler: Rng

  constructor(
    items: readonly TrapItem[],
    limitMs: number,
    glitch: boolean,
    shuffler: Rng,
    io: StageIO,
  ) {
    super(io)
    this.items = items
    this.limitMs = limitMs
    this.glitch = glitch
    this.shuffler = shuffler
    this.marks = items.map(() => 'idle')
    this.paint()
  }

  protected render(): TrapView {
    return {
      item: this.item,
      phase: this.phase,
      order: [...this.order],
      rule: this.rule,
      picked: this.picked,
      marks: [...this.marks],
      deadline: this.deadline,
    }
  }

  start(): void {
    this.stop()
    this.marks = this.items.map(() => 'idle')
    this.rule = 0
    this.order = [0, 1, 2, 3]
    this.phase = 'wait'
    this.paint()
    this.after(dur(450), () => this.ask(0))
  }

  tap(colour: number): void {
    if (this.phase !== 'answer') return
    const item = this.items[this.item]
    this.picked = colour
    if (colour === item.answer) return this.settle(true)
    this.settle(
      false,
      `${this.where()} · doğrusu ${INKS[item.answer].name}, sen ${INKS[colour].name}`,
    )
  }

  private where(): string {
    return `${this.items[this.item].part + 1}. bölüm`
  }

  private mix(): void {
    const places = shuffle([0, 1, 2, 3], this.shuffler)
    this.order = this.order.map((_, colour) => places[colour])
  }

  private ask(i: number): void {
    this.item = i
    this.phase = 'answer'
    this.picked = null
    this.marks[i] = 'now'
    this.deadline = Date.now() + this.limitMs
    this.timeout = this.after(this.limitMs, () => this.expire())
    this.io.hold(false)
    this.paint()
  }

  private expire(): void {
    if (this.phase !== 'answer') return
    this.settle(
      false,
      `${this.where()} · süre bitti, doğrusu ${INKS[this.items[this.item].answer].name}`,
    )
  }

  private settle(right: boolean, note?: string): void {
    this.cancel(this.timeout)
    this.deadline = null
    this.marks[this.item] = right ? 'ok' : 'miss'
    this.phase = right ? 'right' : 'wrong'
    this.io.hold(true)
    this.io.score(right ? 1 : 0, right ? 0 : 1, note)
    playSfx(right ? 'correct' : 'wrong')
    this.paint()
    this.after(right ? dur(380) : dur(1100), () => this.advance())
  }

  private advance(): void {
    if (this.glitch) {
      this.mix()
      playSfx('whoosh')
    }
    const next = this.item + 1
    if (next >= this.items.length) {
      this.phase = 'done'
      this.paint()
      return this.io.done()
    }
    if (this.items[next].part !== this.items[this.item].part) return this.warn(next)
    this.ask(next)
  }

  /** The rule changes: an amber warning, the buttons trade places, the pill turns over. */
  private warn(next: number): void {
    this.phase = 'warn'
    playSfx('alarm')
    this.paint()
    this.after(dur(2000), () => {
      this.rule = 1
      this.mix()
      this.phase = 'wait'
      this.paint()
      this.after(dur(650), () => this.ask(next))
    })
  }
}
