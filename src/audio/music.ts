import { TEST_FLAGS_ENABLED } from '@/app/testFlags'
import { musicOut, onAudioUnlocked } from './engine'

// Generative background music (same idea as BuildArena's): a short chord loop played by synth
// voices, with arpeggios, fills and accents re-drawn every bar so it never feels short.
// Changing screens cross-fades between pieces; inside a piece the "intensity" follows the game.
//
//   menu   "Sinyal" — catchy, to pull people to the booth. 112 BPM synthwave in A minor:
//          Am – F – C – G with a hook melody (every second round of the loop), a pumping
//          octave bass, sparkling arpeggio, half-time kick and a big snare.
//   play   "Geri sayım" — tense. 96 BPM in D minor: Dm – B♭ – Gm – A, a ticking low ostinato
//          on sixteenths, a clock tick, a heartbeat kick and a dark pad with a rubbing semitone.
//          Intensity (Final Protocol, last ten seconds) opens the ostinato, doubles the tick
//          and adds hats and a siren; during an Overheat everything is muffled.
//   win    "Sistem ayakta" — uplifting. 118 BPM in C major: C – G – Am – F, bright plucks,
//          a triumphant lead, claps and open hats.
//   close  "Yeniden başlatıldı" — hopeful, a little bittersweet. 88 BPM: Am – F – C – G,
//          soft electric-piano chords, round bass, brushed beat, bells.
//   crash  "Mavi ekran" — melancholic, glitchy lo-fi. 74 BPM in D minor: Dm7 – B♭maj7 – Gm7 – A7,
//          detuned keys, vinyl crackle and the odd stuttering stab.

export type MusicScene = 'menu' | 'play' | 'win' | 'close' | 'crash' | 'off'

export interface MusicMood {
  scene: MusicScene
  /** 0 = calm, 1 = the last seconds */
  intensity?: number
  /** the clock is paused (Overheat): muffled, half the beat */
  muffled?: boolean
}

type SongId = Exclude<MusicScene, 'off'>

interface Chord {
  root: number
  pad: readonly number[]
}

interface Nodes {
  song: SongId
  six: number
  bus: GainNode
  filter: BiquadFilterNode
  pad: BiquadFilterNode
  echo: DelayNode
  drums: GainNode
  lfo: OscillatorNode | null
}

interface Song {
  bpm: number
  barsPerChord: number
  chords: readonly Chord[]
  level: number
  echo: [number, number]
  /** pad low-pass cut-off */
  padHz: number
  play: (ctx: AudioContext, n: Nodes, step: number, t: number, chord: Chord) => void
}

const LOOKAHEAD = 0.15
const OPEN_HZ = 16000
const MUFFLED_HZ = 900

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

let intensity = 0

// ---------------------------------------------------------------- voices

interface ToneOpts {
  type?: OscillatorType
  vol: number
  attack: number
  detune?: number
  lp?: number
}

function tone(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  t: number,
  dur: number,
  o: ToneOpts,
) {
  const osc = ctx.createOscillator()
  osc.type = o.type ?? 'sine'
  osc.frequency.value = freq
  osc.detune.value = o.detune ?? 0
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(o.vol, t + o.attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  let node: AudioNode = osc
  if (o.lp) {
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = o.lp
    node = osc.connect(f)
  }
  node.connect(g).connect(dest)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

let noiseBuf: AudioBuffer | null = null

function noise(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  dur: number,
  freq: number,
  vol: number,
  type: BiquadFilterType,
  attack = 0.002,
) {
  if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(dest)
  src.start(t, Math.random() * 1.5)
  src.stop(t + dur + 0.05)
}

function kick(ctx: AudioContext, dest: AudioNode, t: number, vol: number, from = 140, to = 42) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.frequency.setValueAtTime(from, t)
  osc.frequency.exponentialRampToValueAtTime(to, t + 0.16)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24)
  osc.connect(g).connect(dest)
  osc.start(t)
  osc.stop(t + 0.28)
}

/** A snare with body: a short tone plus band-passed noise. */
function snare(ctx: AudioContext, dest: AudioNode, t: number, vol: number) {
  noise(ctx, dest, t, 0.22, 1900, vol, 'bandpass')
  tone(ctx, dest, 185, t, 0.1, { type: 'triangle', vol: vol * 0.6, attack: 0.002 })
}

/** A glassy bell: a sine with a quiet inharmonic partial. */
function bell(ctx: AudioContext, dest: AudioNode, note: number, t: number, vol: number) {
  tone(ctx, dest, midi(note), t, 1.4, { vol, attack: 0.004 })
  tone(ctx, dest, midi(note) * 2.76, t, 0.45, { vol: vol * 0.25, attack: 0.002 })
}

/** A rising noise sweep into the next phrase. */
function riser(ctx: AudioContext, dest: AudioNode, t: number, dur: number, vol: number) {
  if (!noiseBuf) return
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = 3
  f.frequency.setValueAtTime(400, t)
  f.frequency.exponentialRampToValueAtTime(5000, t + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.9)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(dest)
  src.start(t)
  src.stop(t + dur + 0.05)
}

/** Melody lines: [position in the bar (0–15), MIDI note, length in sixteenths]. */
type Line = readonly (readonly [number, number, number])[]

function lead(ctx: AudioContext, n: Nodes, line: Line, pos: number, t: number, opts: ToneOpts) {
  for (const [at, note, len] of line) {
    if (at !== pos) continue
    tone(ctx, n.bus, midi(note), t, n.six * len + 0.05, opts)
    tone(ctx, n.echo, midi(note), t, n.six * len, { ...opts, vol: opts.vol * 0.45 })
  }
}

// ---------------------------------------------------------------- pieces

/** "Sinyal": the hook, one bar per chord (Am – F – C – G). */
const HOOK: readonly Line[] = [
  [
    [0, 76, 3],
    [3, 74, 3],
    [6, 72, 2],
    [8, 69, 3],
    [11, 72, 3],
    [14, 74, 2],
  ],
  [
    [0, 72, 3],
    [3, 69, 3],
    [6, 65, 4],
    [10, 69, 2],
    [12, 72, 4],
  ],
  [
    [0, 76, 3],
    [3, 74, 3],
    [6, 72, 2],
    [8, 67, 3],
    [11, 72, 3],
    [14, 76, 2],
  ],
  [
    [0, 74, 3],
    [3, 71, 3],
    [6, 67, 4],
    [10, 71, 2],
    [12, 74, 2],
    [14, 79, 2],
  ],
]

/** "Sistem ayakta": a rising, triumphant line over C – G – Am – F. */
const ANTHEM: readonly Line[] = [
  [
    [0, 72, 4],
    [4, 76, 4],
    [8, 79, 4],
    [12, 84, 4],
  ],
  [
    [0, 83, 4],
    [4, 79, 4],
    [8, 74, 4],
    [12, 79, 4],
  ],
  [
    [0, 81, 4],
    [4, 76, 4],
    [8, 72, 4],
    [12, 76, 4],
  ],
  [
    [0, 77, 4],
    [4, 81, 4],
    [8, 84, 6],
  ],
]

const SONGS: Record<SongId, Song> = {
  menu: {
    bpm: 112,
    barsPerChord: 1,
    chords: [
      { root: 45, pad: [57, 60, 64] }, // Am
      { root: 41, pad: [57, 60, 65] }, // F
      { root: 36, pad: [55, 60, 64] }, // C
      { root: 43, pad: [55, 59, 62] }, // G
    ],
    level: 0.72,
    echo: [3, 0.32],
    padHz: 1400,
    play(ctx, n, s, t, chord) {
      const bar = Math.floor(s / 16)
      const pos = s % 16
      const cycle = Math.floor(bar / 4)
      // a wide saw pad, a new chord each bar
      if (pos === 0)
        for (const note of chord.pad)
          for (const detune of [-8, 8])
            tone(ctx, n.pad, midi(note), t, n.six * 16 + 0.3, {
              type: 'sawtooth',
              vol: 0.008,
              attack: 0.25,
              detune,
            })
      // pumping octave bass on eighths (ducked right after the kick)
      if (pos % 2 === 0)
        tone(ctx, n.bus, midi(chord.root - 12 + (pos % 4 === 2 ? 12 : 0)), t, n.six * 1.7, {
          type: 'sawtooth',
          vol: pos % 8 === 0 ? 0.03 : 0.05,
          attack: 0.008,
          lp: 700,
        })
      // sparkling sixteenth arpeggio
      const arp = chord.pad[(pos + bar) % chord.pad.length] + 24
      tone(ctx, n.echo, midi(arp), t, 0.12, { type: 'triangle', vol: 0.009, attack: 0.003 })
      // the hook, every second time round the loop
      if (cycle % 2 === 1)
        lead(ctx, n, HOOK[bar % 4], pos, t, {
          type: 'square',
          vol: 0.016,
          attack: 0.01,
          lp: 2800,
        })
      // half-time beat: kick on 1, big snare on 3, hats on the eighths
      if (pos === 0 || (pos === 10 && bar % 2 === 1)) kick(ctx, n.drums, t, 0.2, 150, 44)
      if (pos === 8) snare(ctx, n.drums, t, 0.05)
      if (pos % 2 === 1) noise(ctx, n.drums, t, 0.04, 8500, 0.012, 'highpass')
      if (bar % 4 === 3 && pos === 8) riser(ctx, n.drums, t, n.six * 8, 0.03)
    },
  },

  play: {
    bpm: 96,
    barsPerChord: 2,
    chords: [
      { root: 38, pad: [62, 65, 69] }, // Dm
      { root: 34, pad: [62, 65, 70] }, // B♭
      { root: 43, pad: [62, 67, 70] }, // Gm
      { root: 45, pad: [61, 64, 69] }, // A (the C♯ keeps it on edge)
    ],
    level: 0.78,
    echo: [6, 0.35],
    padHz: 900,
    play(ctx, n, s, t, chord) {
      const bar = Math.floor(s / 16)
      const pos = s % 16
      const hot = intensity
      // a dark pad with a quiet rubbing semitone over it, every two bars
      if (pos === 0 && bar % 2 === 0) {
        for (const note of chord.pad)
          tone(ctx, n.pad, midi(note), t, n.six * 32 + 1, {
            type: 'triangle',
            vol: 0.012,
            attack: 1.6,
          })
        tone(ctx, n.pad, midi(chord.pad[0] + 1), t, n.six * 32, {
          type: 'sine',
          vol: 0.004,
          attack: 2.5,
        })
      }
      // the ticking ostinato: root and octave on sixteenths, accented on the beat
      tone(ctx, n.bus, midi(chord.root + (pos % 2 === 0 ? 0 : 12)), t, n.six * 0.9, {
        type: 'sawtooth',
        vol: pos % 4 === 0 ? 0.042 : 0.026,
        attack: 0.004,
        lp: 380 + hot * 1100,
      })
      // the clock: a dry tick on the eighths, on every sixteenth when it gets hot
      if (pos % 2 === 0 || hot > 0.6)
        tone(ctx, n.drums, pos % 4 === 0 ? 1650 : 1250, t, 0.025, {
          type: 'square',
          vol: 0.01,
          attack: 0.001,
          lp: 4500,
        })
      // heartbeat: lub-dub on the first beat, a third beat when it's tight
      if (pos === 0) kick(ctx, n.drums, t, 0.16, 85, 38)
      if (pos === 3) kick(ctx, n.drums, t, 0.1, 75, 38)
      if (hot > 0.5 && pos === 8) kick(ctx, n.drums, t, 0.12, 85, 38)
      // a deep boom at each chord change, and a swell into it
      if (pos === 0 && bar % 2 === 0)
        tone(ctx, n.bus, midi(chord.root - 12), t, 1.8, { vol: 0.07, attack: 0.02 })
      if (bar % 2 === 1 && pos === 8) riser(ctx, n.drums, t, n.six * 8, 0.022 + hot * 0.02)
      // heat: sixteenth hats and a two-tone siren
      if (hot > 0.5 && pos % 2 === 1) noise(ctx, n.drums, t, 0.03, 9000, 0.01 * hot, 'highpass')
      if (hot > 0.9 && (pos === 0 || pos === 8))
        tone(ctx, n.echo, midi(pos === 0 ? 81 : 77), t, n.six * 7, {
          type: 'sawtooth',
          vol: 0.008,
          attack: 0.05,
          lp: 2400,
        })
    },
  },

  win: {
    bpm: 118,
    barsPerChord: 1,
    chords: [
      { root: 36, pad: [60, 64, 67, 72] }, // C
      { root: 43, pad: [59, 62, 67, 71] }, // G
      { root: 45, pad: [60, 64, 69, 72] }, // Am
      { root: 41, pad: [60, 65, 69, 72] }, // F
    ],
    level: 0.66,
    echo: [3, 0.28],
    padHz: 2200,
    play(ctx, n, s, t, chord) {
      const bar = Math.floor(s / 16)
      const pos = s % 16
      if (pos === 0)
        for (const note of chord.pad)
          tone(ctx, n.pad, midi(note), t, n.six * 16 + 0.4, {
            type: 'sawtooth',
            vol: 0.006,
            attack: 0.12,
            detune: 6,
          })
      if (pos % 2 === 0)
        tone(ctx, n.bus, midi(chord.root - 12 + (pos % 4 === 2 ? 12 : 0)), t, 0.18, {
          type: 'sawtooth',
          vol: 0.045,
          attack: 0.006,
          lp: 900,
        })
      const pluck = chord.pad[(pos * 3 + bar) % chord.pad.length] + 12
      tone(ctx, n.bus, midi(pluck), t, 0.14, { type: 'triangle', vol: 0.013, attack: 0.003 })
      if (bar >= 2)
        lead(ctx, n, ANTHEM[bar % 4], pos, t, {
          type: 'square',
          vol: 0.014,
          attack: 0.01,
          lp: 3200,
        })
      if (pos % 4 === 0) kick(ctx, n.drums, t, 0.18, 150, 45)
      if (pos === 4 || pos === 12) snare(ctx, n.drums, t, 0.04)
      if (pos % 4 === 2) noise(ctx, n.drums, t, 0.14, 7000, 0.016, 'highpass')
    },
  },

  close: {
    bpm: 88,
    barsPerChord: 2,
    chords: [
      { root: 45, pad: [60, 64, 67, 71] }, // Am7(add9-ish)
      { root: 41, pad: [60, 64, 65, 69] }, // Fmaj7
      { root: 36, pad: [59, 62, 64, 67] }, // Cmaj7
      { root: 43, pad: [59, 62, 65, 67] }, // G7
    ],
    level: 0.85,
    echo: [3, 0.3],
    padHz: 1200,
    play(ctx, n, s, t, chord) {
      const bar = Math.floor(s / 16)
      const pos = s % 16
      if (pos === 0 && bar % 2 === 0)
        for (const note of chord.pad)
          tone(ctx, n.pad, midi(note), t, n.six * 32 + 0.8, {
            type: 'triangle',
            vol: 0.013,
            attack: 1,
          })
      if ((pos === 6 || pos === 12) && Math.random() < 0.85)
        for (const note of chord.pad)
          tone(ctx, n.bus, midi(note + 12), t, 1.1, { vol: 0.012, attack: 0.012 })
      if (pos === 0)
        tone(ctx, n.bus, midi(chord.root - 12), t, n.six * 7, { vol: 0.1, attack: 0.03 })
      if (pos === 10 && Math.random() < 0.6)
        tone(ctx, n.bus, midi(chord.root - 5), t, n.six * 4, { vol: 0.06, attack: 0.03 })
      if ([2, 8, 14].includes(pos) && Math.random() < 0.3)
        bell(ctx, n.echo, chord.pad[Math.floor(Math.random() * chord.pad.length)] + 24, t, 0.014)
      if (pos === 0 || pos === 10) kick(ctx, n.drums, t, 0.11, 110, 40)
      if (pos === 4 || pos === 12) noise(ctx, n.drums, t, 0.16, 1500, 0.025, 'bandpass', 0.01)
      if (pos % 2 === 0) noise(ctx, n.drums, t, 0.05, 7200, 0.009, 'highpass')
    },
  },

  crash: {
    bpm: 74,
    barsPerChord: 2,
    chords: [
      { root: 38, pad: [60, 65, 69, 72] }, // Dm7
      { root: 34, pad: [62, 65, 69, 70] }, // B♭maj7
      { root: 43, pad: [58, 62, 65, 67] }, // Gm7
      { root: 45, pad: [61, 64, 67, 69] }, // A7
    ],
    level: 0.9,
    echo: [4, 0.4],
    padHz: 900,
    play(ctx, n, s, t, chord) {
      const bar = Math.floor(s / 16)
      const pos = s % 16
      // worn, detuned keys
      if (pos === 0 || (pos === 8 && bar % 2 === 1))
        for (const note of chord.pad)
          for (const detune of [-14, 9])
            tone(ctx, n.pad, midi(note), t, 1.6, {
              type: 'triangle',
              vol: 0.01,
              attack: 0.02,
              detune,
            })
      // a stuttering stab now and then: the system still hiccups
      if (pos === 14 && Math.random() < 0.35)
        for (let i = 0; i < 3; i++)
          tone(ctx, n.bus, midi(chord.pad[1] + 12), t + i * n.six * 0.33, 0.06, {
            type: 'square',
            vol: 0.008,
            attack: 0.002,
            lp: 1800,
          })
      if (pos === 0)
        tone(ctx, n.bus, midi(chord.root - 12), t, n.six * 12, { vol: 0.09, attack: 0.05 })
      if ([4, 10].includes(pos) && Math.random() < 0.35)
        bell(ctx, n.echo, chord.pad[Math.floor(Math.random() * chord.pad.length)] + 12, t, 0.012)
      if (pos === 0 || pos === 7) kick(ctx, n.drums, t, 0.1, 95, 38)
      if (pos === 8) noise(ctx, n.drums, t, 0.2, 1400, 0.025, 'bandpass', 0.015)
      // vinyl crackle
      if (Math.random() < 0.5)
        noise(ctx, n.drums, t + Math.random() * n.six, 0.01, 3200, 0.008, 'highpass')
    },
  },
}

// ---------------------------------------------------------------- player

let nodes: Nodes | null = null
let timer: number | undefined
let nextTime = 0
let step = 0
let current: MusicMood = { scene: 'off' }

/** Test builds: which piece is playing and how hard. */
export const musicState = {
  playing: false,
  scene: 'off' as MusicScene,
  intensity: 0,
  muffled: false,
}

function build(ctx: AudioContext, dest: AudioNode, id: SongId): Nodes {
  const song = SONGS[id]
  const six = 60 / song.bpm / 4
  const bus = ctx.createGain()
  bus.gain.value = 0
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = current.muffled ? MUFFLED_HZ : OPEN_HZ
  filter.Q.value = 0.6
  bus.connect(filter).connect(dest)
  const pad = ctx.createBiquadFilter()
  pad.type = 'lowpass'
  pad.frequency.value = song.padHz
  pad.Q.value = 0.4
  pad.connect(bus)
  const echo = ctx.createDelay(2)
  echo.delayTime.value = six * song.echo[0]
  const feedback = ctx.createGain()
  feedback.gain.value = song.echo[1]
  const echoTone = ctx.createBiquadFilter()
  echoTone.type = 'lowpass'
  echoTone.frequency.value = 2200
  echo.connect(echoTone).connect(feedback).connect(echo)
  echoTone.connect(bus)
  const drums = ctx.createGain()
  drums.gain.value = current.muffled ? 0.45 : 1
  drums.connect(bus)
  // the tense pad slowly opens and closes: uneasy breathing
  let lfo: OscillatorNode | null = null
  if (id === 'play' || id === 'crash') {
    lfo = ctx.createOscillator()
    lfo.frequency.value = 0.06
    const depth = ctx.createGain()
    depth.gain.value = 500
    lfo.connect(depth).connect(pad.frequency)
    lfo.start()
  }
  return { song: id, six, bus, filter, pad, echo, drums, lfo }
}

function release(ctx: AudioContext, old: Nodes, fade: number) {
  old.bus.gain.cancelScheduledValues(ctx.currentTime)
  old.bus.gain.setTargetAtTime(0, ctx.currentTime, fade)
  window.setTimeout(() => {
    old.lfo?.stop()
    old.filter.disconnect()
  }, fade * 6000)
}

function schedule() {
  const out = musicOut()
  if (!out || !nodes) return
  const song = SONGS[nodes.song]
  while (nextTime < out.ctx.currentTime + LOOKAHEAD) {
    const bar = Math.floor(step / 16)
    const chord = song.chords[Math.floor(bar / song.barsPerChord) % song.chords.length]
    song.play(out.ctx, nodes, step, nextTime, chord)
    nextTime += nodes.six
    step += 1
  }
}

function stop(fade: number) {
  window.clearInterval(timer)
  timer = undefined
  musicState.playing = false
  const out = musicOut()
  const old = nodes
  nodes = null
  if (out && old) release(out.ctx, old, fade)
}

function apply() {
  musicState.scene = current.scene
  musicState.intensity = intensity
  musicState.muffled = !!current.muffled
  const out = musicOut()
  if (current.scene === 'off' || !out) {
    // a silent scene (the hack alarm) or the music is off: fade out
    if (nodes) stop(current.scene === 'off' ? 0.4 : 0.1)
    return
  }
  const want = current.scene
  const now = out.ctx.currentTime
  if (!nodes || nodes.song !== want) {
    if (nodes) release(out.ctx, nodes, 0.6)
    nodes = build(out.ctx, out.out, want)
    nodes.bus.gain.setTargetAtTime(SONGS[want].level, now, want === 'play' ? 0.3 : 0.9)
    nextTime = now + 0.08
    step = 0
  }
  nodes.filter.frequency.setTargetAtTime(current.muffled ? MUFFLED_HZ : OPEN_HZ, now, 0.35)
  nodes.drums.gain.setTargetAtTime(current.muffled ? 0.45 : 1, now, 0.35)
  if (timer === undefined) timer = window.setInterval(schedule, 25)
  musicState.playing = true
}

/** Picks the music for the screen; called whenever the game state changes. */
export function setMusic(mood: MusicMood): void {
  intensity = Math.max(0, Math.min(1, mood.intensity ?? 0))
  const same =
    mood.scene === current.scene && !!mood.muffled === !!current.muffled && nodes !== null
  current = mood
  if (same) {
    musicState.intensity = intensity
    return
  }
  apply()
}

/** Settings: the music switch changed. */
export function refreshMusic(): void {
  apply()
}

onAudioUnlocked(apply)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(0.2)
    else apply()
  })
}

if (TEST_FLAGS_ENABLED && typeof window !== 'undefined') {
  ;(window as unknown as { __kpMusic: unknown }).__kpMusic = musicState
}
