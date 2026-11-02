import { dur } from '@/app/timing'
import { playSfx } from '@/audio/sfx'
import { BEAM } from '@/game/config'
import type { Rng } from '@/game/rng'
import { traceBeam, type Beam, type BeamLine, type Mirror } from '@/game/stages/beam'
import { StageRunner, type Mark, type StageIO } from '../runner'

export type BeamPhase = 'wait' | 'play' | 'linked' | 'reveal' | 'done'

export interface BeamView {
  line: number
  phase: BeamPhase
  /** Quarter turns of each mirror since the line came up (its drawn angle). */
  turns: number[]
  orient: Mirror[]
  beam: Beam
  deadline: number | null
  taps: number
  marks: Mark[]
}

const turned = (m: Mirror, n: number): Mirror => (n % 2 === 0 ? m : m === '/' ? '\\' : '/')

/**
 * IŞIN YOLU: three lines, each with its own clock; tapping a mirror turns it. When the clock
 * runs out the mirrors turn themselves into the solution, one after another, and the next line
 * comes. Glitch: interference turns a mirror by itself now and then.
 */
export class BeamRunner extends StageRunner<BeamView> {
  private line = 0
  private phase: BeamPhase = 'wait'
  private turns: number[]
  private deadline: number | null = null
  private timeout = 0
  private glitchTimer = 0
  private taps = 0
  private results: ('ok' | 'miss')[] = []

  readonly lines: readonly BeamLine[]
  private readonly glitch: boolean
  private readonly glitchRng: Rng

  constructor(lines: readonly BeamLine[], glitch: boolean, glitchRng: Rng, io: StageIO) {
    super(io)
    this.lines = lines
    this.glitch = glitch
    this.glitchRng = glitchRng
    this.turns = lines[0].start.map(() => 0)
    this.paint()
  }

  private orient(): Mirror[] {
    return this.lines[this.line].start.map((m, i) => turned(m, this.turns[i]))
  }

  protected render(): BeamView {
    const orient = this.orient()
    return {
      line: this.line,
      phase: this.phase,
      turns: [...this.turns],
      orient,
      beam: traceBeam(this.lines[this.line], orient),
      deadline: this.deadline,
      taps: this.taps,
      marks: this.lines.map(
        (_, i) => this.results[i] ?? (i === this.line && this.phase !== 'wait' ? 'now' : 'idle'),
      ),
    }
  }

  start(): void {
    this.stop()
    this.results = []
    this.taps = 0
    this.begin(0)
  }

  tap(mirror: number): void {
    if (this.phase !== 'play') return
    this.turns[mirror]++
    this.taps++
    playSfx('flip')
    this.check()
    this.paint()
  }

  private begin(i: number): void {
    const limit = BEAM.limitsMs[i]
    this.line = i
    this.phase = 'play'
    this.turns = this.lines[i].start.map(() => 0)
    this.deadline = Date.now() + limit
    this.timeout = this.after(limit, () => this.expire())
    if (this.glitch) this.glitchTimer = this.after(BEAM.glitchFlipMs, () => this.interfere())
    this.io.hold(false)
    this.paint()
  }

  private next(): void {
    if (this.line + 1 < this.lines.length) return this.begin(this.line + 1)
    this.phase = 'done'
    this.paint()
    this.io.done()
  }

  private check(): void {
    if (!traceBeam(this.lines[this.line], this.orient()).ok) return
    this.cancel(this.timeout)
    this.cancel(this.glitchTimer)
    this.phase = 'linked'
    this.deadline = null
    this.results[this.line] = 'ok'
    this.io.hold(true)
    this.io.score(1, 0)
    playSfx('correct')
    this.after(dur(950), () => this.next())
  }

  private interfere(): void {
    if (this.phase !== 'play') return
    this.turns[Math.floor(this.glitchRng() * this.turns.length)]++
    playSfx('whoosh')
    this.check()
    this.paint()
    if (this.phase === 'play') {
      this.glitchTimer = this.after(BEAM.glitchFlipMs, () => this.interfere())
    }
  }

  private expire(): void {
    if (this.phase !== 'play') return
    const line = this.lines[this.line]
    const orient = this.orient()
    this.cancel(this.glitchTimer)
    this.phase = 'reveal'
    this.deadline = null
    this.results[this.line] = 'miss'
    this.io.hold(true)
    this.io.score(0, 1, `${this.line + 1}. hat · süre bitti (${this.taps} dokunuş)`)
    playSfx('wrong')
    const wrong = line.mirrors.flatMap((m, i) =>
      m.solution && m.solution !== orient[i] ? [i] : [],
    )
    wrong.forEach((i, n) =>
      this.after(dur(350) + n * dur(200), () => {
        this.turns[i]++
        playSfx('flip')
        this.paint()
      }),
    )
    this.after(dur(350) + wrong.length * dur(200) + dur(1000), () => this.next())
    this.paint()
  }
}
