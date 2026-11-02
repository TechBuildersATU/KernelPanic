import { readMusicOff, readSoundOff, readVolume } from '@/app/settings'
import { TEST_FLAGS_ENABLED } from '@/app/testFlags'

// One shared AudioContext with two buses: effects straight into the master, music on its own
// quieter bus (so every cue stays on top of it). Tablet browsers keep audio locked until a user
// gesture: any touch unlocks it (`unlockOnFirstTouch`); inside the APK it may start at once.
// Everything is synthesised: no sound files.

let ctx: AudioContext | null = null
let master: GainNode | null = null
let music: GainNode | null = null
let noise: AudioBuffer | null = null
const unlockListeners = new Set<() => void>()

export interface AudioOut {
  ctx: AudioContext
  out: GainNode
  noise: AudioBuffer
}

function create(): void {
  if (ctx || typeof window === 'undefined' || !('AudioContext' in window)) return
  ctx = new AudioContext()
  master = ctx.createGain()
  master.gain.value = readVolume()
  master.connect(ctx.destination)
  music = ctx.createGain()
  music.gain.value = 1
  music.connect(master)
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  ctx.addEventListener('statechange', () => {
    if (ctx?.state === 'running') unlockListeners.forEach((fn) => fn())
  })
}

export function unlockAudio(): void {
  create()
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {})
}

/** Unlocks audio on the first touch anywhere (the menu music starts before the button). */
export function unlockOnFirstTouch(): void {
  if (typeof document === 'undefined') return
  // inside the APK the WebView may allow audio straight away
  unlockAudio()
  const touch = () => {
    unlockAudio()
    if (ctx?.state === 'running') document.removeEventListener('pointerdown', touch)
  }
  document.addEventListener('pointerdown', touch)
}

export function onAudioUnlocked(fn: () => void): void {
  unlockListeners.add(fn)
  if (ctx?.state === 'running') fn()
}

export function audioRunning(): boolean {
  return ctx?.state === 'running'
}

/** The effects output, or null while audio is locked, unsupported or switched off. */
export function audioOut(): AudioOut | null {
  if (!ctx || !master || !noise || readSoundOff()) return null
  return { ctx, out: master, noise }
}

/** The music bus, or null while audio is locked or the music / all sound is switched off. */
export function musicOut(): AudioOut | null {
  if (!ctx || !music || !noise || readSoundOff() || readMusicOff()) return null
  return { ctx, out: music, noise }
}

export function setMasterVolume(volume: number): void {
  if (master) master.gain.value = volume
}

/** Test builds count every sound so e2e tests can check that a cue played. */
export function countSound(name: string): void {
  if (!TEST_FLAGS_ENABLED) return
  const w = window as unknown as { __kpSounds?: string[] }
  ;(w.__kpSounds ??= []).push(name)
}
