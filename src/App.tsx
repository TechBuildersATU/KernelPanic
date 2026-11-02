import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { isNativeApp } from '@/app/native'
import { switchScreen } from '@/app/screenSwitch'
import { readReduceEffects, readRoundSeconds } from '@/app/settings'
import { getTestFlags } from '@/app/testFlags'
import { newRound, useGame } from '@/app/useGame'
import { setMusic } from '@/audio/music'
import { Stage } from '@/components/Stage'
import { STAGE_ORDER } from '@/game/config'
import { INITIAL_STATE } from '@/game/engine'
import { isGreen, stageGrade } from '@/game/grades'
import { titleFor, toneOf } from '@/game/titles'
import type { StageRecord, TitleId } from '@/game/types'
import { BootIntro } from '@/fx/BootIntro'
import { ResultTransition } from '@/fx/ResultTransition'
import { World, type WorldScene } from '@/fx/World'
import { Attract, type Mode } from '@/screens/Attract'
import { DuelPlay, PreviewHalf } from '@/screens/DuelPlay'
import { DuelResult } from '@/screens/DuelResult'
import { Hack } from '@/screens/Hack'
import { Play } from '@/screens/Play'
import { Report } from '@/screens/Report'
import { Result } from '@/screens/Result'
import { Settings } from '@/screens/Settings'

/**
 * The round and its end share one container, so the stage screen is never remounted: when the
 * round ends it stays underneath (inert) while the result transition plays on it, then recedes
 * as the result rises (data-revealed). The first broken module cell and the timer are measured
 * for the transition (--bug-x/--bug-y, --tx/--ty, stage pixels).
 */
function Ending({
  state,
  intro,
  revealed,
  children,
}: {
  state: ReturnType<typeof useGame>[0]
  intro: boolean
  revealed: boolean
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  // the outcome is known as the last stage ends; the ending starts once its grade card is over
  const title = state.phase === 'result' && state.outcome ? titleFor(state.outcome) : undefined
  const wrong = state.stages.find((r) => !isGreen(stageGrade(r)))?.slot ?? 5
  useLayoutEffect(() => {
    const el = ref.current
    const stage = el?.closest('[data-stage]')
    if (!el || !stage || !intro || !title) return
    const s = stage.getBoundingClientRect()
    const scale = s.width / 1280 || 1
    const put = (selector: string, x: string, y: string) => {
      const r = el.querySelector(selector)?.getBoundingClientRect()
      if (!r) return
      el.style.setProperty(x, `${(r.left + r.width / 2 - s.left) / scale}px`)
      el.style.setProperty(y, `${(r.top + r.height / 2 - s.top) / scale}px`)
    }
    put(`[data-cell="${wrong}"]`, '--bug-x', '--bug-y')
    put('[data-testid="play-timer"]', '--tx', '--ty')
  }, [intro, wrong, title])
  return (
    <div ref={ref} className="ending" data-title={title} data-revealed={revealed || undefined}>
      {children}
    </div>
  )
}

/** Stage grades that lead to each title, for the preview (share of right steps per stage). */
const PREVIEW: Record<TitleId, readonly number[]> = {
  'system-savior': [1, 1, 1, 1, 1],
  'last-second-hero': [1, 1, 1, 1, 1],
  'all-systems-go': [1, 0.85, 1, 0.83, 1],
  'one-bug-left': [1, 1, 0.33, 0.83, 1],
  'barely-booted': [1, 0.62, 0.67, 1, 0.67],
  'safe-mode': [0.67, 0.38, 1, 0.5, 0.33],
  'error-404': [0.33, 0.23, 0.67, 0.33, 1],
  'kernel-panic': [0.33, 0.15, 0, 0.33, 0.17],
  'almost-a-legend': [1, 1, 0.67, 0.83, 1],
  'turn-it-off-and-on': [0.67, 0.31, 0, 0.33, 0.5],
}

function previewStages(title: TitleId): StageRecord[] {
  return PREVIEW[title].map((share, i) => ({
    slot: i + 1,
    stage: STAGE_ORDER[i],
    variant: 'normal',
    glitch: false,
    ok: Math.round(share * 12),
    miss: 12 - Math.round(share * 12),
    notes: [],
  }))
}

/**
 * Test builds: ?transition=<title>&mood=<mood> plays one result transition on a loop; with
 * &half=1 inside the left half of the duel's split screen.
 */
function TransitionPreview() {
  const { transition, mood, half } = getTestFlags()
  const [run, setRun] = useState(0)
  const title = transition!
  const scene = (
    <ResultTransition
      key={run}
      title={title}
      mood={mood}
      layout={half ? 'half' : 'full'}
      stages={previewStages(title)}
      remainingMs={
        title === 'last-second-hero'
          ? 4_000
          : title === 'almost-a-legend' || title === 'turn-it-off-and-on'
            ? -7_000
            : 23_000
      }
      onReveal={() => {}}
      onDone={() => setRun((n) => n + 1)}
    />
  )
  return (
    <Stage>
      <World scene="play" state={INITIAL_STATE} />
      {half ? <PreviewHalf>{scene}</PreviewHalf> : scene}
    </Stage>
  )
}

export function App() {
  return getTestFlags().transition ? <TransitionPreview /> : <Game />
}

function Game() {
  const [state, game] = useGame()
  // the duel's second player (idle at the button in solo rounds)
  const [state2, game2] = useGame()
  const [mode, setMode] = useState<Mode>('solo')
  // the APK opens with an animation (in the browser only with ?intro=1)
  const [intro, setIntro] = useState(() => isNativeApp() || getTestFlags().intro)
  const [settings, setSettings] = useState(false)
  const [reduceEffects] = useState(readReduceEffects)
  // the result transition plays once per round, not again after the error report
  const [introPlayed, setIntroPlayed] = useState(0)
  const [revealed, setRevealed] = useState(0)
  // the duel's result comes up (cross-fading) once both players' endings have played
  const [duelSettled, setDuelSettled] = useState(0)
  const [duelShown, setDuelShown] = useState(0)
  const duel = mode === 'duel'
  const duelDone = duel && state.phase === 'result' && state2.phase === 'result'

  // Background music per screen (the stage screen sets its own intensity, Play.tsx / DuelPlay):
  // a catchy theme on the button, silence under the hack alarm, a theme per result tone.
  useEffect(() => {
    if (state.phase === 'attract') setMusic({ scene: 'menu' })
    else if (state.phase === 'hack') setMusic({ scene: 'off' })
    else if (!duel && (state.phase === 'result' || state.phase === 'report')) {
      const tone = toneOf(titleFor(state.outcome!))
      setMusic({ scene: tone === 'good' ? 'win' : tone })
    }
  }, [state.phase, state.outcome, duel])

  useEffect(() => {
    if (duelDone) setMusic({ scene: 'win' })
  }, [duelDone])

  // both endings played: a moment on the two titles, then the duel's result cross-fades in
  useEffect(() => {
    if (!duelDone || duelSettled !== state.round || duelShown === state.round) return
    const id = window.setTimeout(() => switchScreen(() => setDuelShown(state.round)), 1400)
    return () => window.clearTimeout(id)
  }, [duelDone, duelSettled, duelShown, state.round])

  // screen changes cross-fade over the world (play → result is the result transition instead)
  const go = useMemo(
    () => ({
      press: () =>
        switchScreen(() => {
          game.press()
          if (mode === 'duel') game2.press()
        }),
      // the duel's two players get the same round (same difficulty, their own answers)
      start: () =>
        switchScreen(() => {
          const round = newRound(mode === 'duel')
          game.start(round, mode === 'duel' ? 1 : 0)
          if (mode === 'duel') game2.start(round, 2)
        }),
      openReport: () => switchScreen(game.openReport),
      closeReport: () => switchScreen(game.closeReport),
      restart: () =>
        switchScreen(() => {
          game.restart()
          game2.restart()
        }),
      settings: (open: boolean) => switchScreen(() => setSettings(open)),
    }),
    [game, game2, mode],
  )

  const scene: WorldScene =
    settings || state.phase === 'attract'
      ? 'idle'
      : state.phase === 'hack'
        ? 'alarm'
        : state.phase === 'play' || (duel && !duelDone)
          ? 'play'
          : 'result'

  return (
    <Stage reduceEffects={reduceEffects}>
      <World scene={scene} state={state} />
      <div className="screens">
        {settings && <Settings onClose={() => go.settings(false)} />}
        {!settings && state.phase === 'attract' && (
          <Attract
            mode={mode}
            onMode={setMode}
            onPress={go.press}
            onSettings={() => go.settings(true)}
          />
        )}
        {state.phase === 'hack' && (
          <Hack roundSeconds={readRoundSeconds()} duel={duel} onDone={go.start} />
        )}

        {duel &&
          (state.phase === 'play' || state.phase === 'result') &&
          (duelDone && duelShown === state.round ? (
            <DuelResult states={[state, state2]} onRestart={go.restart} />
          ) : (
            <DuelPlay
              states={[state, state2]}
              games={[game, game2]}
              onHome={go.restart}
              onSettled={() => setDuelSettled(state.round)}
            />
          ))}

        {!duel && (state.phase === 'play' || state.phase === 'result') && (
          <Ending
            state={state}
            intro={state.phase === 'result' && introPlayed !== state.round}
            revealed={revealed === state.round}
          >
            {(state.phase === 'play' || introPlayed !== state.round) && (
              <Play state={state} game={game} onHome={go.restart} />
            )}
            {state.phase === 'result' && (
              <Result
                state={state}
                intro={introPlayed !== state.round}
                onReveal={() => setRevealed(state.round)}
                onIntroDone={() => setIntroPlayed(state.round)}
                onReport={go.openReport}
                onRestart={go.restart}
              />
            )}
          </Ending>
        )}
        {!duel && state.phase === 'report' && (
          <Report state={state} onBack={go.closeReport} onRestart={go.restart} />
        )}
      </div>
      {intro && <BootIntro onDone={() => setIntro(false)} />}
    </Stage>
  )
}
