import {
  blinkAmount,
  BLINK_MS,
  CENTRE,
  lidPath,
  LOOKS,
  nextLook,
  towards,
  TRAVEL,
  type LookId,
} from './geometry'

// The eye's motion: one GazeDirector per button screen decides where the eyes look and when they
// blink (in the duel both eyes look together, like a face); each EyeMotion moves one eye's iris,
// pupil and lids by writing the SVG's attributes. Kept out of React on purpose: per-frame writes
// are not state. Performance (the booth tablet): every write repaints the whole eye, so the eye
// only moves while it glides, blinks, turns its ring or changes its lids, and holds perfectly
// still in between — nothing is written while nothing changes.

/** The parts of one eye's drawing that move. */
export interface EyeParts {
  button: HTMLElement
  look: SVGGElement
  pupil: SVGGElement
  spin: SVGGElement
  lidTop: SVGPathElement
  lidBottom: SVGPathElement
}

/** What the eye is doing: looking around, holding still for a player, or caught being pressed. */
export type EyeState = 'free' | 'ready-right' | 'ready-left' | 'pressed'

const easeOut = (t: number) => 1 - (1 - t) ** 3

export class EyeMotion {
  /** Holds its gaze (pressed, or a ready duel player looking at the other one). */
  held = false
  private gaze = { x: 0, y: 0 }
  private from = { x: 0, y: 0 }
  private to = { x: 0, y: 0 }
  private t0 = 0
  private moveMs = 1
  private blinks: number[] = []
  private lid = 0
  private lidTarget = 0
  private pupil = 1
  private pupilTarget = 1
  private spin = 0
  private boost = 0
  readonly parts: EyeParts
  /** Reduced motion: slower glides. */
  private readonly calm: boolean

  constructor(parts: EyeParts, calm: boolean) {
    this.parts = parts
    this.calm = calm
  }

  /** A quick glide (a saccade) to a new gaze; the lens' ring turns as it refocuses. */
  lookAt(x: number, y: number, now: number, speed = 1): void {
    this.from = { ...this.gaze }
    this.to = { x, y }
    const far = Math.hypot(x - this.gaze.x, y - this.gaze.y)
    this.t0 = now
    this.moveMs = (this.calm ? 700 : 110 + 120 * far) / speed
    this.boost = Math.min(1.5, far)
  }

  blink(at: number): void {
    this.blinks.push(at)
  }

  /** Lids and pupil: open, squinting at the visitor, or wide open with a tiny pupil (pressed). */
  mood(mood: 'open' | 'squint' | 'wide'): void {
    this.lidTarget = mood === 'squint' ? 0.3 : mood === 'wide' ? -0.3 : 0
    this.pupilTarget = mood === 'wide' ? 0.5 : 1
  }

  state(state: EyeState, now: number): void {
    this.held = state !== 'free'
    if (state === 'pressed') {
      this.lookAt(0, 0, now, 2.4)
      this.mood('wide')
    } else if (state === 'free') {
      this.mood('open')
    } else {
      // the ready player's eye looks across at the other player while it waits
      this.lookAt(state === 'ready-right' ? 0.95 : -0.95, 0.05, now, 1.2)
      this.mood('open')
    }
  }

  /** The eye's centre on screen and how far away a point must be for a full sideways look. */
  where(): { x: number; y: number; reach: number } {
    const r = this.parts.button.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, reach: (230 * r.width) / 480 }
  }

  /** Writes an attribute only when its value changed (an unchanged eye is never repainted). */
  private set(el: Element, name: string, value: string): void {
    if (el.getAttribute(name) !== value) el.setAttribute(name, value)
  }

  update(now: number, dt: number): void {
    const k = Math.min(1, Math.max(0, (now - this.t0) / this.moveMs))
    const e = easeOut(k)
    this.gaze.x = this.from.x + (this.to.x - this.from.x) * e
    this.gaze.y = this.from.y + (this.to.y - this.from.y) * e
    const gx = this.gaze.x
    const gy = this.gaze.y
    // the iris foreshortens along the way it looks, like a lens on a sphere
    const m = Math.min(1, Math.hypot(gx, gy))
    const a = ((Math.atan2(gy, gx) * 180) / Math.PI).toFixed(1)
    const x = (240 + gx * TRAVEL.x).toFixed(1)
    const y = (240 + gy * TRAVEL.y).toFixed(1)
    const squash = (1 - 0.17 * m).toFixed(2)
    this.set(
      this.parts.look,
      'transform',
      `translate(${x} ${y}) rotate(${a}) scale(${squash} 1) rotate(${-Number(a)})`,
    )

    this.pupil += (this.pupilTarget - this.pupil) * Math.min(1, dt / 90)
    if (Math.abs(this.pupilTarget - this.pupil) < 0.005) this.pupil = this.pupilTarget
    this.set(this.parts.pupil, 'transform', `scale(${this.pupil.toFixed(2)})`)

    this.lid += (this.lidTarget - this.lid) * Math.min(1, dt / 120)
    if (Math.abs(this.lidTarget - this.lid) < 0.005) this.lid = this.lidTarget
    this.blinks = this.blinks.filter((at) => now - at < BLINK_MS)
    const shut = Math.max(0, ...this.blinks.map((at) => blinkAmount(now - at)))
    const closed = this.lid + (1 - this.lid) * shut
    this.set(this.parts.lidTop, 'd', lidPath('top', closed))
    this.set(this.parts.lidBottom, 'd', lidPath('bottom', closed))

    // the lens' ring turns while the eye refocuses (a glance), then rests
    this.boost *= 0.5 ** (dt / 220)
    if (this.boost < 0.01) this.boost = 0
    this.spin = (this.spin + dt * 0.35 * this.boost) % 360
    this.set(this.parts.spin, 'transform', `rotate(${this.spin.toFixed(1)})`)
  }
}

/**
 * Decides for every eye on the button screen: a new place to look every `lookMs` (sometimes with
 * a blink on the way), a blink of its own now and then, a look at wherever the screen is touched,
 * and — once nobody has touched it for a while — a squinting look at the visitor with a double
 * blink. Marks the eye buttons with `data-look` (where they look) for the tests.
 */
export class GazeDirector {
  private readonly eyes = new Set<EyeMotion>()
  private frame = 0
  private last = 0
  private look: number = CENTRE
  private nextLookAt = 0
  private nextBlinkAt = 0
  private nudging = false
  private nudges = 0
  private readonly lookMs: number
  private readonly touchMs: number
  private readonly rng: () => number

  constructor(lookMs: number, touchMs: number, rng: () => number = Math.random) {
    this.lookMs = lookMs
    this.touchMs = touchMs
    this.rng = rng
  }

  add(eye: EyeMotion): () => void {
    this.eyes.add(eye)
    const now = performance.now()
    eye.blink(now + 500)
    eye.blink(now + 800)
    this.mark(eye, LOOKS[this.look].id)
    return () => this.eyes.delete(eye)
  }

  start(): void {
    if (this.frame) return
    const now = performance.now()
    this.last = now
    this.nextLookAt = now + 1200
    this.nextBlinkAt = now + 2600
    this.frame = requestAnimationFrame(this.tick)
  }

  stop(): void {
    cancelAnimationFrame(this.frame)
    this.frame = 0
  }

  /** A touch on the screen (client coordinates): the free eyes look there for a while. */
  touch(x: number, y: number): void {
    const now = performance.now()
    for (const eye of this.free()) {
      const at = eye.where()
      const g = towards(x, y, at.x, at.y, at.reach)
      eye.lookAt(g.x, g.y, now, 1.4)
      eye.mood('open')
      this.mark(eye, 'touch')
    }
    this.nextLookAt = now + this.touchMs
  }

  /** Nobody touched the screen for a while (or somebody did again). */
  setNudge(on: boolean): void {
    if (on === this.nudging) return
    this.nudging = on
    this.nudges = 0
    if (on) this.nextLookAt = performance.now()
    else for (const eye of this.free()) eye.mood('open')
  }

  private free(): EyeMotion[] {
    return [...this.eyes].filter((eye) => !eye.held)
  }

  private mark(eye: EyeMotion, look: LookId | 'touch'): void {
    eye.parts.button.dataset.look = look
  }

  private lookAround(now: number): void {
    const eyes = this.free()
    if (this.nudging && this.nudges % 2 === 0) {
      // bored: it turns to the visitor, squints and blinks twice
      this.look = CENTRE
      for (const eye of eyes) {
        eye.lookAt(0, 0, now)
        eye.mood('squint')
        eye.blink(now + 450)
        eye.blink(now + 760)
      }
    } else {
      this.look = nextLook(this.look, this.rng)
      const { x, y } = LOOKS[this.look]
      const blink = this.rng() < 0.3
      for (const eye of eyes) {
        eye.lookAt(x, y, now)
        eye.mood('open')
        if (blink) eye.blink(now + 10)
      }
    }
    if (this.nudging) this.nudges++
    for (const eye of eyes) this.mark(eye, LOOKS[this.look].id)
    this.nextLookAt = now + this.lookMs
  }

  private readonly tick = (now: number): void => {
    const dt = Math.min(64, now - this.last)
    this.last = now
    if (now >= this.nextLookAt) this.lookAround(now)
    if (now >= this.nextBlinkAt) {
      for (const eye of this.free()) eye.blink(now)
      this.nextBlinkAt = now + 3800 + this.rng() * 3700
    }
    for (const eye of this.eyes) eye.update(now, dt)
    this.frame = requestAnimationFrame(this.tick)
  }
}
