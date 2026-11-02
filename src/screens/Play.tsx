import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { dur } from '@/app/timing'
import type { GameActions } from '@/app/useGame'
import { useNow } from '@/app/useNow'
import { setMusic } from '@/audio/music'
import { playSfx, type Sfx } from '@/audio/sfx'
import { EventBanner } from '@/components/EventBanner'
import { HomeButton } from '@/components/HomeButton'
import { IntegrityCells } from '@/components/IntegrityCells'
import { useScramble } from '@/fx/useScramble'
import { STAGE_TEXT } from '@/data/texts'
import { LOW_TIME_MS, STAGE_COUNT, STAGE_END_MS } from '@/game/config'
import { clockMs, integrity, isGlitchStage, stageAt, type GameState } from '@/game/engine'
import { isGreen, stageGrade, stageShare } from '@/game/grades'
import type { EventKind } from '@/game/types'
import { Cooling } from './play/Cooling'
import { OverheatAlarm } from './play/OverheatAlarm'
import { StageEnd } from './play/StageEnd'
import { StageHost } from './play/StageHost'
import s from './Play.module.css'

/** How long an event toast / the time-shift label stays up. */
const BANNER_MS = 1800

const EVENT_SFX: Record<EventKind, Sfx> = {
  overheat: 'overheat',
  glitch: 'glitch',
  power: 'power',
}

/** mm:ss — a bonus can take the clock past the round length (01:06); "+00:07" once it ran out. */
function clock(ms: number): string {
  const sec = Math.ceil(Math.abs(ms) / 1000)
  const text = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
  return ms < 0 ? `+${text}` : text
}

/** Live background: the event on screen, or the calm after Power Restored (§3.4). */
type LiveMood = 'overheat' | 'glitch' | 'calm' | 'normal'

function liveMood(state: GameState): LiveMood {
  if (state.overlay) return state.overlay.kind
  if (isGlitchStage(state) && !state.ended) return 'glitch'
  return state.events.at(-1) === 'power' ? 'calm' : 'normal'
}

/** The terminal line under the stage: what the system just did. */
function logLine(state: GameState): { text: string; tone: 'ok' | 'bad' | 'info' } {
  const overlay = state.overlay
  if (overlay?.kind === 'overheat') {
    return overlay.step === 'alarm'
      ? { text: 'UYARI: çekirdek sıcaklığı kritik', tone: 'bad' }
      : { text: 'sogutma_protokolu.sys çalışıyor · dokunma', tone: 'info' }
  }
  const last = state.stages.at(-1)
  if (state.ended && last) {
    const pct = Math.round(stageShare(last) * 100)
    const file = `${STAGE_TEXT[last.stage].file}_0${last.slot}`
    return isGreen(stageGrade(last))
      ? { text: `${file} onarıldı: %${pct}`, tone: 'ok' }
      : { text: `${file} hasarlı: %${pct}`, tone: 'bad' }
  }
  if (isGlitchStage(state)) return { text: 'veri bütünlüğü bozuldu: 0x6L1TCH', tone: 'bad' }
  const text = STAGE_TEXT[stageAt(state.index)].log
  return { text, tone: state.index === STAGE_COUNT - 1 ? 'bad' : 'info' }
}

/** The stage's name in the HUD; a glitched one settles out of noise. */
function StageName({ text, glitch }: { text: string; glitch: boolean }) {
  const decoded = useScramble(text, glitch, 1100)
  return (
    <span className={s.stageName} data-testid="stage-name">
      {glitch ? decoded : text}
    </span>
  )
}

interface Props {
  state: GameState
  game: GameActions
  /** 'half': one player's side of the duel (640 px wide; the duel sets the music). */
  layout?: 'full' | 'half'
  /** Shows the house button (hold it to go back to the button screen). */
  onHome?: () => void
}

/**
 * The round (§2.3): five stages in one card that stays put for the whole round — each stage's
 * game comes up under a title card, is played to its end and leaves its grade colour on its
 * module in the HUD. Overheat, Glitch and Power Restored (§3) happen around it.
 */
export function Play({ state, game, layout = 'full', onHome }: Props) {
  const decided = state.outcome !== null
  const now = useNow(100, !decided)
  const time = clockMs(state, now)
  const left = Math.max(0, time)
  const overtime = time <= 0 && !decided
  const overlay = state.overlay
  const low = !decided && time <= LOW_TIME_MS
  const final = state.index === STAGE_COUNT - 1 && !overlay
  const mood = liveMood(state)
  const log = logLine(state)

  // the stage under an event panel or a grade card is the one that just ended
  const hostIndex = state.ended || overlay ? Math.max(0, state.stages.length - 1) : state.index
  const active = !state.ended && !overlay && !decided && hostIndex === state.index
  const ended = state.ended && !overlay ? state.stages.at(-1) : undefined
  const hostGlitch = isGlitchStage(state, hostIndex)

  // when the stage on screen came up (the glitch banner shows for a moment)
  const [entered, setEntered] = useState({ index: state.index, at: now })
  if (entered.index !== state.index) setEntered({ index: state.index, at: now })

  // The grade card stays a moment, then the round moves on (or to the result after the final).
  const next = useEffectEvent(game.next)
  useEffect(() => {
    if (!state.ended || overlay) return
    const id = window.setTimeout(() => next(), dur(STAGE_END_MS))
    return () => window.clearTimeout(id)
  }, [state.ended, overlay, state.index])

  // Every new event announces itself.
  const eventCount = state.events.length
  const lastEvent = state.events.at(-1)
  useEffect(() => {
    if (lastEvent) playSfx(EVENT_SFX[lastEvent])
  }, [eventCount, lastEvent])

  // Time gained or lost.
  const shiftAt = state.lastShift?.at
  const shiftDelta = state.lastShift?.deltaMs ?? 0
  useEffect(() => {
    if (shiftAt) playSfx(shiftDelta > 0 ? 'bonus' : 'penalty')
  }, [shiftAt, shiftDelta])

  // The driving theme: harder on the final and in the last ten seconds, muffled while the
  // Overheat holds the clock.
  const cooling = overlay?.kind === 'overheat'
  useEffect(() => {
    if (decided || layout === 'half') return
    setMusic({ scene: 'play', intensity: low ? 1 : final ? 0.7 : 0.35, muffled: cooling })
  }, [low, final, cooling, decided, layout])

  // Heartbeat when the final stage comes up.
  useEffect(() => {
    if (final) playSfx('final')
  }, [final])

  // A tick every second in the last ten seconds (not after the clock has run out).
  const lastTick = useRef(0)
  const second = Math.ceil(left / 1000)
  useEffect(() => {
    if (!low || overtime || state.pausedAt !== null || second === lastTick.current) return
    lastTick.current = second
    playSfx('tick')
  }, [low, overtime, second, state.pausedAt])

  const showGlitchBanner = hostGlitch && active && now - entered.at < BANNER_MS + 1200
  const showPower = state.powerAt !== null && now - state.powerAt < BANNER_MS
  const showShift = state.lastShift !== null && now - state.lastShift.at < BANNER_MS
  const kind = final ? 'final' : hostGlitch ? 'glitch' : 'main'

  return (
    <main
      className={s.root}
      data-testid="play"
      data-layout={layout}
      data-final={final}
      data-low={low}
      data-overtime={overtime}
      data-paused={overlay !== null}
      data-held={state.pausedAt !== null && !overlay}
      data-mood={mood}
      data-glitch={hostGlitch && !state.ended}
      data-stage={stageAt(state.index)}
    >
      {showPower && (
        <div key={`bloom-${state.powerAt}`} className={s.powerBloom} aria-hidden="true" />
      )}

      <header className={s.hud} data-power={showPower}>
        <p className={s.mission} data-testid="mission">
          {cooling ? (
            <>SOĞUTMA</>
          ) : (
            <>
              AŞAMA <strong>{state.index + 1}</strong>/{STAGE_COUNT}
              <StageName
                key={state.index}
                text={STAGE_TEXT[stageAt(state.index)].name.toLocaleUpperCase('tr')}
                glitch={isGlitchStage(state) && !overlay}
              />
            </>
          )}
        </p>
        <div
          className={s.timer}
          role="timer"
          data-testid="play-timer"
          aria-label={
            time > 0
              ? `Kalan süre ${Math.ceil(time / 1000)} saniye`
              : `Süre doldu, ${Math.ceil(-time / 1000)} saniye geçti`
          }
        >
          <div className={s.bar}>
            <div
              className={s.fill}
              style={{ transform: `scaleX(${Math.min(1, left / state.roundMs)})` }}
            />
          </div>
          <span className={s.time} data-testid="play-time">
            {clock(time)}
          </span>
          {overlay && (
            <span className={s.pausedChip} data-testid="timer-paused">
              DURDU
            </span>
          )}
          {overtime && !overlay && (
            <span className={s.overChip} data-testid="overtime">
              SÜRE DOLDU
            </span>
          )}
          {showShift && (
            <span
              key={state.lastShift!.at}
              className={s.shift}
              data-tone={state.lastShift!.deltaMs > 0 ? 'ok' : 'bad'}
              data-testid="time-shift"
            >
              {state.lastShift!.deltaMs > 0 ? '+' : '−'}
              {Math.abs(state.lastShift!.deltaMs / 1000)} sn
            </span>
          )}
        </div>
        <div className={s.integrity}>
          <span className={s.integrityLabel}>
            Sistem <strong data-testid="integrity">%{integrity(state.stages)}</strong>
          </span>
          <IntegrityCells stages={state.stages} current={decided ? -1 : state.index} />
        </div>
      </header>

      <section
        className={s.card}
        data-testid="stage-card"
        data-kind={kind}
        data-dim={overlay !== null}
      >
        <StageHost
          key={`${state.round}-${hostIndex}`}
          index={hostIndex}
          seed={state.seed}
          player={state.player}
          glitch={hostGlitch}
          active={active}
          onHold={game.hold}
          onScore={game.score}
          onDone={game.stageDone}
        />
        {ended && <StageEnd key={ended.slot} record={ended} />}
      </section>

      {overlay?.kind === 'overheat' && overlay.step === 'alarm' && (
        <OverheatAlarm mode={overlay.mode} onReady={game.overheatReady} />
      )}
      {overlay?.kind === 'overheat' && overlay.step === 'cooling' && (
        <Cooling mode={overlay.mode} onDone={game.coolingDone} />
      )}

      <p className={s.log} data-tone={log.tone} data-testid="play-log">
        <span key={log.text} className={s.logText}>
          &gt; {log.text}
        </span>
      </p>

      {onHome && <HomeButton onHome={onHome} className={s.home} />}

      {showGlitchBanner && <EventBanner kind="glitch" />}
      {showPower && <EventBanner key={`power-${state.powerAt}`} kind="power" />}
    </main>
  )
}
