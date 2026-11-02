import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BASMA, ISIN, PIKSEL, RENK, TUZAK } from '@/game/config'
import { seededRng } from '@/game/rng'
import { makeOrders } from '@/game/stages/basma'
import { makeBeamLine, solutionOf } from '@/game/stages/isin'
import { makePixelScreens } from '@/game/stages/piksel'
import { makeLayers } from '@/game/stages/renk'
import { makeTrapItems } from '@/game/stages/tuzak'
import type { StageIO } from '@/screens/stages/runner'
import { PressRunner } from '@/screens/stages/runners/basma'
import { BeamRunner } from '@/screens/stages/runners/isin'
import { PixelRunner } from '@/screens/stages/runners/piksel'
import { ColourRunner } from '@/screens/stages/runners/renk'
import { TrapRunner } from '@/screens/stages/runners/tuzak'

// The stage games' logic, with fake timers: every stage is played to its end, a mistake or a
// step running out of time only costs that step, and the round clock is held while the player
// only watches.

interface Log {
  io: StageIO
  ok: number
  miss: number
  notes: string[]
  holds: boolean[]
  done: number
}

function record(): Log {
  const log: Log = {
    ok: 0,
    miss: 0,
    notes: [],
    holds: [],
    done: 0,
    io: {
      hold: (on) => log.holds.push(on),
      score: (ok, miss, note) => {
        log.ok += ok
        log.miss += miss
        if (note) log.notes.push(note)
      },
      done: () => log.done++,
    },
  }
  return log
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Ölü Piksel runner', () => {
  const screens = makePixelScreens(seededRng(1))
  const wrongCell = (i: number) => (screens[i].odd + 1) % (screens[i].size * screens[i].size)

  it('a found pixel moves on; the clock holds while the next screen comes', () => {
    const log = record()
    const game = new PixelRunner(screens, log.io)
    game.start()
    expect(game.snapshot()).toMatchObject({ screen: 0, phase: 'find' })
    expect(log.holds).toEqual([false])
    game.tap(screens[0].odd)
    expect(game.snapshot().phase).toBe('hit')
    expect(log.holds).toEqual([false, true])
    vi.advanceTimersByTime(700)
    expect(game.snapshot()).toMatchObject({ screen: 1, phase: 'find' })
  })

  it('a wrong pixel takes 2 s off this screen; out of time shows the pixel, then the next', () => {
    const log = record()
    const game = new PixelRunner(screens, log.io)
    game.start()
    const deadline = game.snapshot().deadline!
    game.tap(wrongCell(0))
    expect(game.snapshot().deadline).toBe(deadline - PIKSEL.wrongPenaltyMs)
    expect(log.miss).toBe(0)
    vi.advanceTimersByTime(PIKSEL.limitsMs[0] - PIKSEL.wrongPenaltyMs)
    expect(game.snapshot().phase).toBe('reveal')
    expect(log).toMatchObject({ ok: 0, miss: 1, notes: ['1. ekran · süre bitti'] })
    vi.advanceTimersByTime(PIKSEL.revealMs)
    expect(game.snapshot()).toMatchObject({ screen: 1, phase: 'find' })
  })

  it('every screen is played even after misses: 4 missed, the last one found → done', () => {
    const log = record()
    const game = new PixelRunner(screens, log.io)
    game.start()
    for (let i = 0; i < 4; i++) vi.advanceTimersByTime(PIKSEL.limitsMs[i] + PIKSEL.revealMs)
    game.tap(screens[4].odd)
    vi.advanceTimersByTime(700)
    expect(log).toMatchObject({ ok: 1, miss: 4, done: 1 })
    expect(game.snapshot().marks).toEqual(['miss', 'miss', 'miss', 'miss', 'ok'])
  })

  it('three wrong pixels on a 5 s screen run its clock out at once', () => {
    const log = record()
    const game = new PixelRunner(screens, log.io)
    game.start()
    game.tap(wrongCell(0))
    game.tap(wrongCell(0))
    game.tap(wrongCell(0))
    expect(game.snapshot().phase).toBe('reveal')
    expect(log.miss).toBe(1)
  })
})

describe('Dört Renk runner', () => {
  const layers = makeLayers('normal', false, seededRng(2))
  const showMs = (i: number) =>
    600 + layers[i].seq.length * (layers[i].onMs + RENK.gapMs) + (layers[i].swap ? 1100 : 250)

  it('the clock holds during the show and runs while the player repeats', () => {
    const log = record()
    const game = new ColourRunner(layers, seededRng(3), log.io)
    game.start()
    expect(game.snapshot().phase).toBe('show')
    expect(log.holds).toEqual([true])
    vi.advanceTimersByTime(showMs(0))
    expect(game.snapshot().phase).toBe('input')
    expect(log.holds).toEqual([true, false])
    for (const pad of layers[0].seq) game.tap(pad)
    expect(game.snapshot().phase).toBe('pass')
    expect(log.ok).toBe(3)
  })

  it('a wrong colour ends the layer: the rest counts as missed and the next layer comes', () => {
    const log = record()
    const game = new ColourRunner(layers, seededRng(3), log.io)
    game.start()
    vi.advanceTimersByTime(showMs(0))
    game.tap(layers[0].seq[0])
    game.tap((layers[0].seq[1] + 1) % 4)
    expect(game.snapshot().phase).toBe('fail')
    expect(log).toMatchObject({ ok: 1, miss: 2 })
    expect(log.notes[0]).toMatch(/^katman 1 · 2\. renkte .+, doğrusu .+$/)
    vi.advanceTimersByTime(1600)
    expect(game.snapshot()).toMatchObject({ layer: 1, phase: 'show' })
  })

  it('waiting too long ends the layer too; the pads trade places on the last layer', () => {
    const log = record()
    const game = new ColourRunner(layers, seededRng(3), log.io)
    game.start()
    vi.advanceTimersByTime(showMs(0) + RENK.idleMs)
    expect(log).toMatchObject({ miss: 3, notes: ['katman 1 · 0/3 renk, sonra durdun'] })
    vi.advanceTimersByTime(1600 + showMs(1) + RENK.idleMs + 1600)
    const before = game.snapshot().order
    vi.advanceTimersByTime(showMs(2))
    expect(game.snapshot().phase).toBe('input')
    expect(game.snapshot().order.every((place, pad) => place !== before[pad])).toBe(true)
    for (const pad of layers[2].seq) game.tap(pad)
    vi.advanceTimersByTime(1000)
    expect(log).toMatchObject({ ok: 5, miss: 8, done: 1 })
  })
})

describe('Işın Yolu runner', () => {
  const rng = seededRng(4)
  const lines = ISIN.lines.normal.map((size) => makeBeamLine(size, rng))

  function solve(game: BeamRunner, line: number) {
    const target = solutionOf(lines[line], lines[line].start)
    const view = game.snapshot()
    lines[line].mirrors.forEach((m, i) => {
      if (m.solution && view.orient[i] !== target[i]) game.tap(i)
    })
  }

  it('turning the right mirrors links the line, then the next one comes', () => {
    const log = record()
    const game = new BeamRunner(lines, false, seededRng(5), log.io)
    game.start()
    expect(game.snapshot().beam.ok).toBe(false)
    solve(game, 0)
    expect(game.snapshot()).toMatchObject({ phase: 'linked' })
    expect(game.snapshot().beam.ok).toBe(true)
    expect(log.ok).toBe(1)
    vi.advanceTimersByTime(1000)
    expect(game.snapshot()).toMatchObject({ line: 1, phase: 'play' })
  })

  it('out of time: the mirrors turn into the solution, then the next line', () => {
    const log = record()
    const game = new BeamRunner(lines, false, seededRng(5), log.io)
    game.start()
    vi.advanceTimersByTime(ISIN.limitsMs[0])
    expect(game.snapshot().phase).toBe('reveal')
    expect(log.notes[0]).toBe('1. hat · süre bitti (0 dokunuş)')
    vi.advanceTimersByTime(350 + 200 * lines[0].mirrors.length)
    expect(game.snapshot().beam.ok).toBe(true)
    vi.advanceTimersByTime(1000)
    expect(game.snapshot()).toMatchObject({ line: 1, phase: 'play' })
  })

  it('glitch: a mirror turns by itself every 2.2 s', () => {
    const game = new BeamRunner(lines, true, seededRng(5), record().io)
    game.start()
    const turns = () => game.snapshot().turns.reduce((a, b) => a + b, 0)
    vi.advanceTimersByTime(ISIN.glitchFlipMs)
    expect(turns()).toBe(1)
  })
})

describe('Renk Tuzağı runner', () => {
  const items = makeTrapItems(seededRng(6))

  it('right, wrong and too late each cost or earn one word; the rule changes after three', () => {
    const log = record()
    const game = new TrapRunner(items, TUZAK.limitMs.normal, false, seededRng(7), log.io)
    game.start()
    vi.advanceTimersByTime(450)
    expect(game.snapshot()).toMatchObject({ item: 0, phase: 'answer', rule: 0 })
    game.tap(items[0].answer)
    vi.advanceTimersByTime(380)
    game.tap((items[1].answer + 1) % 4)
    expect(game.snapshot().phase).toBe('wrong')
    vi.advanceTimersByTime(1100 + TUZAK.limitMs.normal)
    expect(log).toMatchObject({ ok: 1, miss: 2 })
    expect(log.notes[1]).toMatch(/süre bitti, doğrusu/)
    vi.advanceTimersByTime(1100)
    expect(game.snapshot().phase).toBe('warn')
    vi.advanceTimersByTime(2000 + 650)
    expect(game.snapshot()).toMatchObject({ item: 3, phase: 'answer', rule: 1 })
    for (let i = 3; i < 6; i++) {
      game.tap(items[i].answer)
      vi.advanceTimersByTime(380)
    }
    expect(log).toMatchObject({ ok: 4, miss: 2, done: 1 })
  })
})

describe('Basma Dedik runner', () => {
  const orders = makeOrders(seededRng(8))

  /** Plays the command on screen right, using the runner's own clock. */
  function playRight(game: PressRunner) {
    const eff = game.snapshot().eff
    if (eff === 'bas') game.press()
    if (eff === 'basma') vi.advanceTimersByTime(BASMA.windowMs.basma)
    if (eff === 'uc') for (let i = 0; i < 3; i++) game.press()
    if (eff === 'tut') {
      game.press()
      vi.advanceTimersByTime(BASMA.holdMs)
      game.frame()
      game.release()
    }
    if (eff === 'yesil') {
      vi.advanceTimersByTime(1100)
      game.press()
    }
  }

  it('six commands, TERS MOD before the last two; all right → 6/6', () => {
    const log = record()
    const game = new PressRunner(orders, log.io)
    game.start()
    for (let i = 0; i < 6; i++) {
      if (game.snapshot().phase === 'ters') vi.advanceTimersByTime(1700)
      expect(game.snapshot()).toMatchObject({ idx: i, phase: 'cmd' })
      playRight(game)
      expect(game.snapshot().phase).toBe('ok')
      vi.advanceTimersByTime(600)
    }
    expect(log).toMatchObject({ ok: 6, miss: 0, done: 1 })
  })

  it('letting go after a full BASILI TUT counts, even before a frame noticed it', () => {
    const log = record()
    const game = new PressRunner([{ kind: 'tut', inverted: false, step: 0 }], log.io)
    game.start()
    game.press()
    vi.advanceTimersByTime(BASMA.holdMs + 50)
    game.release()
    expect(game.snapshot().phase).toBe('ok')
    expect(log).toMatchObject({ ok: 1, miss: 0 })
  })

  it('a missed command costs only itself: the next one still comes', () => {
    const log = record()
    const game = new PressRunner(orders, log.io)
    game.start()
    const first = game.snapshot().eff
    // let the first command run out (BASILI TUT / 3 KEZ / YEŞİLDE all need a press)
    vi.advanceTimersByTime(4000)
    expect(game.snapshot().phase).toBe('miss')
    expect(log.miss).toBe(1)
    expect(first).not.toBe('basma')
    vi.advanceTimersByTime(1200)
    expect(game.snapshot()).toMatchObject({ idx: 1, phase: 'cmd' })
  })

  it('letting go of BASILI TUT early, or pressing on red, is a miss', () => {
    const log = record()
    const game = new PressRunner(
      [
        { kind: 'tut', inverted: false, step: 0 },
        { kind: 'yesil', inverted: false, step: 1 },
      ],
      log.io,
    )
    game.start()
    game.press()
    vi.advanceTimersByTime(600)
    game.release()
    expect(log.notes[0]).toBe("BASILI TUT · 0,6 sn'de bıraktın")
    vi.advanceTimersByTime(1200)
    game.press()
    expect(log.notes[1]).toBe('YEŞİLDE BAS · kırmızıda bastın')
  })
})
