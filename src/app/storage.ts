// localStorage can throw (private mode, blocked site data). Every access is wrapped in
// try/catch and falls back to a safe default.

export const STORAGE_KEYS = {
  /** Round length in seconds: 45 | 60 | 75 (hidden settings). */
  roundSeconds: 'kernelpanic.roundSeconds',
  /** Master volume 0–100. */
  volume: 'kernelpanic.volume',
  soundOff: 'kernelpanic.soundOff',
  /** Background music off (effects keep playing). */
  musicOff: 'kernelpanic.musicOff',
  /** "Efekt azalt": fewer flashes and shakes. */
  reduceEffects: 'kernelpanic.reduceEffects',
} as const

export function readFlag(key: string): boolean {
  return readString(key) === '1'
}

export function writeFlag(key: string, value: boolean): void {
  writeString(key, value ? '1' : null)
}

export function readString(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

/** `null` removes the key. */
export function writeString(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    // Storage unavailable: the value simply isn't remembered.
  }
}
