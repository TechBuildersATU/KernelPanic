import { useEffect, useState, type ComponentType } from 'react'
import { dur } from '@/app/timing'
import { STAGE_TEXT } from '@/data/texts'
import { STAGE_COUNT, STAGE_INTRO_MS } from '@/game/config'
import { stageAt } from '@/game/engine'
import type { Player } from '@/game/stages/players'
import type { StageId, Variant } from '@/game/types'
import { OrdersStage } from '../stages/OrdersStage'
import { BeamStage } from '../stages/BeamStage'
import type { StageProps } from '../stages/runner'
import { PixelStage } from '../stages/PixelStage'
import { ColoursStage } from '../stages/ColoursStage'
import { TrapStage } from '../stages/TrapStage'
import s from './StageHost.module.css'

const GAMES: Record<StageId, ComponentType<StageProps>> = {
  pixel: PixelStage,
  colours: ColoursStage,
  beam: BeamStage,
  trap: TrapStage,
  orders: OrdersStage,
}

interface Props {
  index: number
  seed: number
  player: Player
  variant: Variant
  glitch: boolean
  /** The stage is being played (false once it has ended: it stays, dimmed, under the card). */
  active: boolean
  onHold: (on: boolean) => void
  onScore: (ok: number, miss: number, note?: string) => void
  onDone: () => void
}

/**
 * One stage: its game is already on screen, dimmed, under a title card (number, name, the
 * command); the card lets go and the game comes up to full light and starts.
 */
export function StageHost({ index, seed, player, variant, glitch, active, ...on }: Props) {
  const stage = stageAt(index)
  const text = STAGE_TEXT[stage]
  const [live, setLive] = useState(false)
  useEffect(() => {
    if (!active) return
    const id = window.setTimeout(() => setLive(true), dur(STAGE_INTRO_MS))
    return () => window.clearTimeout(id)
  }, [active])

  const Game = GAMES[stage]
  const final = index === STAGE_COUNT - 1
  const chip =
    variant === 'risky'
      ? { text: 'RİSKLİ KANAL · en zor sürüm', tone: 'risky' }
      : variant === 'safe'
        ? { text: 'GÜVENLİ KANAL · kolay sürüm', tone: 'safe' }
        : glitch && text.glitch
          ? { text: `GLITCH · ${text.glitch}`, tone: 'glitch' }
          : final
            ? { text: 'FİNAL · tek kumanda kırmızı buton', tone: 'final' }
            : null

  return (
    <div className={s.host} data-testid="stage" data-stage={stage} data-live={live}>
      <div className={s.game} data-live={live} data-active={active}>
        <Game
          seed={seed}
          player={player}
          variant={variant}
          glitch={glitch}
          live={live && active}
          {...on}
        />
      </div>
      <div className={s.intro} data-hidden={live} aria-hidden={live} data-testid="stage-intro">
        <p className={s.kicker}>
          AŞAMA {index + 1}/{STAGE_COUNT} · {final ? 'FİNAL · ' : ''}
          {text.name.toLocaleUpperCase('tr')}
        </p>
        <p className={s.command}>{text.command}</p>
        <p className={s.hint}>{text.hint}</p>
        {chip && (
          <p className={s.chip} data-tone={chip.tone}>
            {chip.text}
          </p>
        )}
      </div>
    </div>
  )
}
