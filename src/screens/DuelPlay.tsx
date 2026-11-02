import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react'
import type { GameActions } from '@/app/useGame'
import { useNow } from '@/app/useNow'
import { setMusic } from '@/audio/music'
import { HomeButton } from '@/components/HomeButton'
import { IntegrityCells } from '@/components/IntegrityCells'
import { TITLES } from '@/data/texts'
import { LOW_TIME_MS, STAGE_COUNT } from '@/game/config'
import { duelPoints, formatPoints } from '@/game/duel'
import { clockMs, type GameState } from '@/game/engine'
import { moodOf } from '@/game/events'
import { isGreen, stageGrade } from '@/game/grades'
import { titleColour, titleFor } from '@/game/titles'
import { ResultTransition } from '@/fx/ResultTransition'
import { Play } from './Play'
import s from './DuelPlay.module.css'

interface Props {
  states: readonly [GameState, GameState]
  games: readonly [GameActions, GameActions]
  onHome: () => void
  /** Both players' endings have played: the duel's result may come. */
  onSettled: () => void
}

/**
 * The duel (§2.5): the screen split in two, the same five stages side by side — player 1 (blue)
 * on the left, player 2 (orange) on the right, each with their own clock. Each half only takes
 * its own touches. Who finishes first gets their ending on their half — the same result
 * transition as a solo round, as big as their screen — then waits while the other plays on.
 */
export function DuelPlay({ states, games, onHome, onSettled }: Props) {
  const now = useNow(250)
  const running = states.filter((st) => st.phase === 'play' && !st.outcome)
  const low = running.some((st) => clockMs(st, now) <= LOW_TIME_MS)
  const final = running.some((st) => st.index === STAGE_COUNT - 1)
  const cooling = running.some((st) => st.overlay?.kind === 'overheat')

  // the round each half's ending last played in
  const [played, setPlayed] = useState<readonly [number, number]>([0, 0])
  const settled = states.every((st, side) => st.phase === 'result' && played[side] === st.round)
  const settle = useEffectEvent(onSettled)
  useEffect(() => {
    if (settled) settle()
  }, [settled])

  // one piece of music for both: the closest race sets the intensity
  useEffect(() => {
    if (running.length === 0) return
    setMusic({ scene: 'play', intensity: low ? 1 : final ? 0.7 : 0.35, muffled: cooling })
  }, [running.length, low, final, cooling])

  return (
    <main className={s.root} data-testid="duel">
      {states.map((state, side) => (
        <Half
          key={side}
          side={side + 1}
          state={state}
          game={games[side]}
          both={states.every((st) => st.phase === 'result')}
          onPlayed={() =>
            setPlayed((p) => (side === 0 ? [state.round, p[1]] : [p[0], state.round]))
          }
        />
      ))}
      <div className={s.divider} aria-hidden="true">
        <span>VS</span>
      </div>
      <HomeButton onHome={onHome} className={s.home} />
    </main>
  )
}

interface HalfProps {
  side: number
  state: GameState
  game: GameActions
  /** Both players are done. */
  both: boolean
  onPlayed: () => void
}

/**
 * One player's half. When their round ends it works like the solo screen (App.tsx <Ending>):
 * the stage screen stays underneath, inert, while the result transition plays on it, zoomed to
 * the half; then the screen recedes and the player's title waits for the other player.
 */
function Half({ side, state, game, both, onPlayed }: HalfProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(0)
  const [played, setPlayed] = useState(0)
  const done = state.phase === 'result' && state.outcome !== null
  const title = done ? titleFor(state.outcome!) : undefined
  const ending = done && played !== state.round
  const wrong = state.stages.find((r) => !isGreen(stageGrade(r)))?.slot ?? 5

  // the pieces that grow out of the HUD (the broken module's lens) are placed in the scene's own
  // 1280×800 coordinates, before the first paint
  useLayoutEffect(() => {
    const wrap = ref.current
    const root = wrap?.querySelector('[data-testid="result-transition"]')
    if (!wrap || !root || !ending) return
    const r = root.getBoundingClientRect()
    const scale = r.width / 1280 || 1
    const put = (selector: string, x: string, y: string) => {
      const c = wrap.querySelector(selector)?.getBoundingClientRect()
      if (!c) return
      wrap.style.setProperty(x, `${(c.left + c.width / 2 - r.left) / scale}px`)
      wrap.style.setProperty(y, `${(c.top + c.height / 2 - r.top) / scale}px`)
    }
    put(`[data-cell="${wrong}"]`, '--bug-x', '--bug-y')
    put('[data-testid="play-timer"]', '--tx', '--ty')
  }, [ending, wrong])

  return (
    <section className={s.half} data-side={side} data-testid={`half-${side}`} data-done={done}>
      <div
        ref={ref}
        className="ending"
        data-title={title}
        data-revealed={revealed === state.round || undefined}
      >
        <Play state={state} game={game} layout="half" />
        {ending && (
          <ResultTransition
            layout="half"
            title={title!}
            mood={moodOf(state.events)}
            stages={state.stages}
            remainingMs={state.outcome!.remainingMs}
            onReveal={() => setRevealed(state.round)}
            onDone={() => {
              setRevealed(state.round)
              setPlayed(state.round)
              onPlayed()
            }}
          />
        )}
      </div>
      <p className={s.tag} data-testid="half-tag">
        <b>{side}</b> OYUNCU {side}
      </p>
      {done && revealed === state.round && <Waiting state={state} both={both} />}
    </section>
  )
}

/** A player whose ending has played: their title and modules on their half, waiting. */
function Waiting({ state, both }: { state: GameState; both: boolean }) {
  const title = titleFor(state.outcome!)
  return (
    <div className={s.waiting} data-colour={titleColour(title)} data-testid="duel-waiting">
      <p className={s.kicker}>SİSTEM KAPANDI</p>
      <p className={s.title}>{TITLES[title].title}</p>
      <IntegrityCells stages={state.stages} current={-1} />
      <p className={s.points}>
        <b>%{formatPoints(duelPoints(state.outcome!))}</b> kurtarıldı
      </p>
      <p className={s.wait}>
        {both ? 'Sonuçlar geliyor' : 'Rakip hâlâ oynuyor'}
        <span>…</span>
      </p>
    </div>
  )
}

/** Test builds: the result transition preview inside player 1's half (?transition=…&half=1). */
export function PreviewHalf({ children }: { children: React.ReactNode }) {
  return (
    <main className={s.root}>
      <section className={s.half} data-side={1} data-testid="half-1">
        {children}
      </section>
      <div className={s.divider} aria-hidden="true">
        <span>VS</span>
      </div>
    </main>
  )
}
