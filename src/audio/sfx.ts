import { audioOut, countSound, type AudioOut } from './engine'

// Synthesised sound effects (§7). The booth is loud: cues are short, sharp and distinct, and
// every one of them also has a visual counterpart on screen.

export type Sfx =
  | 'press'
  | 'alarm'
  | 'count'
  | 'go'
  | 'correct'
  | 'wrong'
  | 'tick'
  | 'final'
  | 'success'
  | 'crash'
  | 'type'
  | 'overheat'
  | 'glitch'
  | 'emergency'
  | 'power'
  | 'bonus'
  | 'penalty'
  | 'pad0'
  | 'pad1'
  | 'pad2'
  | 'pad3'
  | 'miss'
  | 'whoosh'
  | 'up'
  | 'flip'
  | 'grade'

interface ToneOptions {
  at?: number
  dur: number
  freq: number
  to?: number
  type?: OscillatorType
  gain?: number
  /** Low-pass cutoff; keeps saw/square tones from getting harsh. */
  cutoff?: number
}

function tone(
  a: AudioOut,
  { at = 0, dur, freq, to, type = 'sine', gain = 0.3, cutoff }: ToneOptions,
) {
  const t = a.ctx.currentTime + at
  const osc = a.ctx.createOscillator()
  const env = a.ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  env.gain.setValueAtTime(0.0001, t)
  env.gain.exponentialRampToValueAtTime(gain, t + 0.008)
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  let node: AudioNode = osc
  if (cutoff) {
    const lp = a.ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = cutoff
    osc.connect(lp)
    node = lp
  }
  node.connect(env).connect(a.out)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function hiss(a: AudioOut, { at = 0, dur, gain = 0.2, cutoff = 2000 }: Omit<ToneOptions, 'freq'>) {
  const t = a.ctx.currentTime + at
  const src = a.ctx.createBufferSource()
  src.buffer = a.noise
  const lp = a.ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = cutoff
  const env = a.ctx.createGain()
  env.gain.setValueAtTime(gain, t)
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(lp).connect(env).connect(a.out)
  src.start(t)
  src.stop(t + dur + 0.02)
}

const RECIPES: Record<Sfx, (a: AudioOut) => void> = {
  // heavy mechanical thunk of the big button
  press: (a) => {
    tone(a, { dur: 0.28, freq: 160, to: 42, gain: 0.9 })
    hiss(a, { dur: 0.05, gain: 0.35, cutoff: 3000 })
  },
  // two-tone siren, ~1.8 s
  alarm: (a) => {
    for (let i = 0; i < 4; i++) {
      tone(a, {
        at: i * 0.45,
        dur: 0.44,
        freq: 620,
        to: 930,
        type: 'sawtooth',
        gain: 0.2,
        cutoff: 2600,
      })
      tone(a, {
        at: i * 0.45,
        dur: 0.44,
        freq: 310,
        to: 465,
        type: 'square',
        gain: 0.08,
        cutoff: 1200,
      })
    }
  },
  count: (a) => tone(a, { dur: 0.13, freq: 880, type: 'square', gain: 0.22, cutoff: 3500 }),
  go: (a) => {
    tone(a, { dur: 0.3, freq: 1320, type: 'square', gain: 0.22, cutoff: 4000 })
    tone(a, { dur: 0.3, freq: 660, gain: 0.3 })
  },
  correct: (a) => {
    tone(a, { dur: 0.1, freq: 660, type: 'triangle', gain: 0.45 })
    tone(a, { at: 0.09, dur: 0.2, freq: 990, type: 'triangle', gain: 0.45 })
  },
  wrong: (a) => {
    tone(a, { dur: 0.34, freq: 140, type: 'sawtooth', gain: 0.34, cutoff: 1400 })
    tone(a, { dur: 0.34, freq: 148, type: 'sawtooth', gain: 0.3, cutoff: 1400 })
  },
  tick: (a) => tone(a, { dur: 0.035, freq: 1800, type: 'square', gain: 0.12, cutoff: 5000 }),
  // heartbeat before the Final Protocol question
  final: (a) => {
    tone(a, { dur: 0.14, freq: 75, to: 48, gain: 0.95 })
    tone(a, { at: 0.22, dur: 0.14, freq: 70, to: 45, gain: 0.75 })
  },
  success: (a) => {
    ;[523, 659, 784, 1047].forEach((freq, i) =>
      tone(a, { at: i * 0.09, dur: 0.32, freq, type: 'triangle', gain: 0.32 }),
    )
  },
  crash: (a) => {
    tone(a, { dur: 1.2, freq: 420, to: 38, type: 'sawtooth', gain: 0.32, cutoff: 1800 })
    hiss(a, { dur: 0.7, gain: 0.3, cutoff: 900 })
  },
  type: (a) => tone(a, { dur: 0.018, freq: 2400, type: 'square', gain: 0.035, cutoff: 6000 }),
  // fast two-tone alarm + sizzling steam (§3.1)
  overheat: (a) => {
    for (let i = 0; i < 3; i++) {
      tone(a, { at: i * 0.26, dur: 0.12, freq: 1040, type: 'square', gain: 0.18, cutoff: 3000 })
      tone(a, {
        at: i * 0.26 + 0.13,
        dur: 0.12,
        freq: 780,
        type: 'square',
        gain: 0.18,
        cutoff: 3000,
      })
    }
    hiss(a, { at: 0.1, dur: 0.9, gain: 0.16, cutoff: 5000 })
  },
  // stuttering digital noise (§3.2)
  glitch: (a) => {
    for (let i = 0; i < 5; i++) {
      hiss(a, { at: i * 0.07, dur: 0.04, gain: 0.3, cutoff: 6000 - i * 900 })
      tone(a, { at: i * 0.07, dur: 0.04, freq: 200 + i * 340, type: 'square', gain: 0.1 })
    }
  },
  // low klaxon (§3.3)
  emergency: (a) => {
    for (let i = 0; i < 2; i++) {
      tone(a, { at: i * 0.42, dur: 0.36, freq: 440, type: 'sawtooth', gain: 0.24, cutoff: 1800 })
      tone(a, { at: i * 0.42, dur: 0.36, freq: 554, type: 'sawtooth', gain: 0.16, cutoff: 1800 })
    }
  },
  // power coming back: a rising sweep and a bright chord (§3.4)
  power: (a) => {
    tone(a, { dur: 0.6, freq: 120, to: 960, type: 'sawtooth', gain: 0.16, cutoff: 2400 })
    ;[784, 988, 1175].forEach((freq, i) =>
      tone(a, { at: 0.55 + i * 0.06, dur: 0.5, freq, type: 'triangle', gain: 0.24 }),
    )
  },
  bonus: (a) => {
    tone(a, { dur: 0.09, freq: 880, type: 'triangle', gain: 0.35 })
    tone(a, { at: 0.08, dur: 0.09, freq: 1320, type: 'triangle', gain: 0.35 })
    tone(a, { at: 0.16, dur: 0.16, freq: 1760, type: 'triangle', gain: 0.3 })
  },
  penalty: (a) =>
    tone(a, { dur: 0.4, freq: 520, to: 180, type: 'square', gain: 0.2, cutoff: 2000 }),
  // Dört Renk: one note per pad (E4, G#4, B4, E5 — they sound good in any order)
  pad0: (a) => tone(a, { dur: 0.34, freq: 330, type: 'triangle', gain: 0.5 }),
  pad1: (a) => tone(a, { dur: 0.34, freq: 415, type: 'triangle', gain: 0.5 }),
  pad2: (a) => tone(a, { dur: 0.34, freq: 494, type: 'triangle', gain: 0.5 }),
  pad3: (a) => tone(a, { dur: 0.34, freq: 659, type: 'triangle', gain: 0.5 }),
  // a wrong pixel: a soft low blip, not the full error
  miss: (a) => tone(a, { dur: 0.14, freq: 190, type: 'sawtooth', gain: 0.22, cutoff: 1200 }),
  // pads / buttons trading places
  whoosh: (a) => {
    tone(a, { dur: 0.32, freq: 240, to: 620, type: 'triangle', gain: 0.18 })
    hiss(a, { dur: 0.3, gain: 0.12, cutoff: 3200 })
  },
  // a layer passed
  up: (a) => {
    tone(a, { dur: 0.09, freq: 988, type: 'triangle', gain: 0.35 })
    tone(a, { at: 0.08, dur: 0.12, freq: 1318, type: 'triangle', gain: 0.35 })
  },
  // a mirror turning
  flip: (a) => tone(a, { dur: 0.05, freq: 1400, to: 900, type: 'square', gain: 0.1, cutoff: 4000 }),
  // the stage's grade lands on its module
  grade: (a) => {
    tone(a, { dur: 0.5, freq: 220, to: 440, type: 'triangle', gain: 0.25 })
    tone(a, { at: 0.12, dur: 0.4, freq: 660, type: 'triangle', gain: 0.2 })
  },
}

export function playSfx(name: Sfx): void {
  countSound(name)
  const a = audioOut()
  if (!a) return
  try {
    RECIPES[name](a)
  } catch (error) {
    console.error(error)
  }
}
