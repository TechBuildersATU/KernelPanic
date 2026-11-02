import { useNow } from '@/app/useNow'
import { LOW_TIME_MS } from '@/game/config'
import { clockMs, isGlitchStage, type GameState } from '@/game/engine'
import { isGreen, stageGrade } from '@/game/grades'
import { PALETTE } from '@/game/palette'
import { titleFor, toneOf } from '@/game/titles'
import { CodeRain } from './CodeRain'
import { Embers } from './Embers'
import s from './World.module.css'

// The one world every screen sits on: the code rain, a perspective grid floor, the light of the
// room and the CRT glass. It never unmounts, so when the game changes mood the room changes
// with it — cyan while waiting, red when the system crashes, the event's colour during an
// event, the result's colour at the end — gliding, never cutting.

export type WorldScene = 'idle' | 'alarm' | 'play' | 'result'

/** Light of the room during a round (same rules as the stage screen). */
type PlayMood = 'overheat' | 'emergency' | 'glitch' | 'calm' | 'normal'

function playMood(state: GameState): PlayMood {
  if (state.overlay) return state.overlay.kind
  if (isGlitchStage(state) && !state.ended) return 'glitch'
  return state.events.at(-1) === 'power' ? 'calm' : 'normal'
}

const RAIN: Record<string, string> = {
  idle: PALETTE.cyan,
  alarm: PALETTE.alarm,
  normal: PALETTE.alarm,
  calm: PALETTE.amber,
  overheat: PALETTE.warn,
  emergency: PALETTE.warn,
  glitch: PALETTE.cyan,
  good: PALETTE.codeGreen,
  close: PALETTE.warn,
  crash: PALETTE.alarm,
}

export function World({ scene, state }: { scene: WorldScene; state: GameState }) {
  const playing = scene === 'play' && state.outcome === null
  const now = useNow(250, playing)
  const mood = scene === 'play' ? playMood(state) : 'normal'
  const low = playing && clockMs(state, now) <= LOW_TIME_MS
  const tone = scene === 'result' && state.outcome ? toneOf(titleFor(state.outcome)) : undefined
  // the red fades as modules come back up (green or lime)
  const crisis = 1 - state.stages.filter((r) => isGreen(stageGrade(r))).length / 5
  const light = scene === 'idle' ? 'idle' : scene === 'alarm' ? 'alarm' : (tone ?? mood)

  return (
    <div
      className={`${s.world} crt`}
      data-testid="world"
      data-scene={scene}
      data-light={light}
      data-low={low}
      style={{ '--crisis': crisis } as never}
      aria-hidden="true"
    >
      <CodeRain
        color={RAIN[light] ?? PALETTE.alarm}
        speed={
          scene === 'alarm'
            ? 1.7
            : light === 'emergency'
              ? 0 // the screen freezes while the Emergency choice is read
              : light === 'calm' || scene === 'result'
                ? 0.6
                : scene === 'idle'
                  ? 0.9
                  : 1.2
        }
      />
      <div className={s.grid} />
      {[
        'idle',
        'alarm',
        'normal',
        'calm',
        'overheat',
        'emergency',
        'glitch',
        'good',
        'close',
        'crash',
      ].map((name) => (
        <div key={name} className={s.light} data-light={name} data-on={light === name} />
      ))}
      <div className={s.lowPulse} />
      <Embers active={scene === 'play' && mood === 'overheat'} />
    </div>
  )
}
