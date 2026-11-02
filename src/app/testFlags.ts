// Test-only URL flags: ?seed=N (deterministic stages and events), ?fastTimers=1 (shorter
// animation waits), ?event=glitch|overheat-fast|overheat-slow|power|none (force an event, or none),
// ?transition=<title>&mood=<mood> (preview one result transition on its own; &half=1 in one half
// of the duel), ?intro=1 (play the APK's opening animation in the browser), ?perf=low (the light
// mode a slow device gets, at once).
// They are compiled out of the production build unless VITE_TEST_FLAGS=1.

import type { ForcedEvent, Mood } from '@/game/events'
import type { TitleId } from '@/game/types'

export interface TestFlags {
  seed: number | undefined
  fastTimers: boolean
  event: ForcedEvent | undefined
  transition: TitleId | undefined
  mood: Mood
  /** The transition preview in one half of the duel's split screen. */
  half: boolean
  intro: boolean
  /** Start in the light mode of a slow device (app/perf.ts). */
  lowPerf: boolean
}

const NO_FLAGS: TestFlags = {
  seed: undefined,
  fastTimers: false,
  event: undefined,
  transition: undefined,
  mood: 'normal',
  half: false,
  intro: false,
  lowPerf: false,
}

export const TITLE_IDS: readonly TitleId[] = [
  'system-savior',
  'last-second-hero',
  'all-systems-go',
  'one-bug-left',
  'barely-booted',
  'safe-mode',
  'error-404',
  'kernel-panic',
  'almost-a-legend',
  'turn-it-off-and-on',
]
const MOODS: readonly Mood[] = ['overheat', 'glitch', 'power', 'normal']

const FORCEABLE: readonly ForcedEvent[] = [
  'glitch',
  'power',
  'overheat-fast',
  'overheat-slow',
  'none',
]

export const TEST_FLAGS_ENABLED =
  import.meta.env.DEV || import.meta.env.MODE === 'test' || import.meta.env.VITE_TEST_FLAGS === '1'

export function parseTestFlags(search: string): TestFlags {
  const params = new URLSearchParams(search)
  const seed = Number.parseInt(params.get('seed') ?? '', 10)
  const event = params.get('event')
  return {
    seed: Number.isFinite(seed) ? seed : undefined,
    fastTimers: params.get('fastTimers') === '1',
    event: FORCEABLE.find((e) => e === event),
    transition: TITLE_IDS.find((t) => t === params.get('transition')),
    mood: MOODS.find((m) => m === params.get('mood')) ?? 'normal',
    half: params.get('half') === '1',
    intro: params.get('intro') === '1',
    lowPerf: params.get('perf') === 'low',
  }
}

let cached: TestFlags | undefined

/** Flags from the URL the app was opened with; read once at startup. */
export function getTestFlags(): TestFlags {
  if (!TEST_FLAGS_ENABLED) return NO_FLAGS
  cached ??= parseTestFlags(window.location.search)
  return cached
}
