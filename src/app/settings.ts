import { DEFAULT_ROUND_SECONDS, ROUND_SECONDS_OPTIONS } from '@/game/config'
import type { RoundSeconds } from '@/game/types'
import { readFlag, readString, STORAGE_KEYS, writeFlag, writeString } from './storage'

// Device settings (hidden settings menu, Faz 2), with safe defaults.

export function readRoundSeconds(): RoundSeconds {
  const value = Number(readString(STORAGE_KEYS.roundSeconds))
  return ROUND_SECONDS_OPTIONS.find((s) => s === value) ?? DEFAULT_ROUND_SECONDS
}

export function writeRoundSeconds(seconds: RoundSeconds): void {
  writeString(STORAGE_KEYS.roundSeconds, String(seconds))
}

/** Master volume 0–1 (default 0.9: the booth is loud). */
export function readVolume(): number {
  const value = Number(readString(STORAGE_KEYS.volume))
  return Number.isFinite(value) && readString(STORAGE_KEYS.volume) !== null
    ? Math.min(1, Math.max(0, value / 100))
    : 0.9
}

export function writeVolume(volume: number): void {
  writeString(STORAGE_KEYS.volume, String(Math.round(Math.min(1, Math.max(0, volume)) * 100)))
}

export function readSoundOff(): boolean {
  return readFlag(STORAGE_KEYS.soundOff)
}

export function writeSoundOff(off: boolean): void {
  writeFlag(STORAGE_KEYS.soundOff, off)
}

export function readMusicOff(): boolean {
  return readFlag(STORAGE_KEYS.musicOff)
}

export function writeMusicOff(off: boolean): void {
  writeFlag(STORAGE_KEYS.musicOff, off)
}

export function readReduceEffects(): boolean {
  return readFlag(STORAGE_KEYS.reduceEffects)
}

export function writeReduceEffects(on: boolean): void {
  writeFlag(STORAGE_KEYS.reduceEffects, on)
}
