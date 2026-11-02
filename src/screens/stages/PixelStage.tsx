import { TEST_FLAGS_ENABLED } from '@/app/testFlags'
import { PIXEL } from '@/game/config'
import { LOOK_NAMES, PIXEL_TAGS } from '@/game/stages/pixel'
import { pixelScreensFor } from '@/game/stages/players'
import { Dots, Level, Say, StepTimer } from './kit'
import { TONES, useRunner, type StageProps } from './runner'
import { PixelRunner } from './runners/pixel'
import k from './Stage.module.css'
import s from './PixelStage.module.css'

const pct = (n: number) => String(n).replace('.', ',')

const SAY = {
  wait: { text: 'hazırlan', tone: '' },
  find: { text: 'farklı kareye dokun', tone: 'go' },
  hit: { text: 'bulundu', tone: 'ok' },
  reveal: { text: 'süre bitti · buradaydı', tone: 'bad' },
  done: { text: 'ekranlar tarandı', tone: 'ok' },
}

/** ÖLÜ PİKSEL (stage 1): find the square that is a shade off, on five screens. */
export function PixelStage(props: StageProps) {
  const [game, view] = useRunner(
    props,
    (io) => new PixelRunner(pixelScreensFor(props.seed, props.player), io),
  )
  const screen = game.screens[view.screen]
  const level = PIXEL.levels[view.screen]

  return (
    <div className={k.game} data-testid="stage-pixel" data-phase={view.phase}>
      <aside className={k.side}>
        <Level
          label="EKRAN"
          index={view.screen}
          total={game.screens.length}
          tag={PIXEL_TAGS[level]}
          tone={TONES[level]}
        />
        <p className={k.info}>
          renk farkı <b>%{pct(screen.diff)}</b>
        </p>
        <p className={k.info} data-testid="pixel-panel">
          panel <b>{LOOK_NAMES[screen.look]}</b>
        </p>
        <Dots marks={view.marks} label="Ekranlar" />
        <div className={s.clock}>
          <StepTimer deadline={view.deadline} total={screen.limitMs} />
          {view.penalty > 0 && view.phase === 'find' && (
            <span key={view.penalty} className={k.penalty} data-testid="penalty">
              −{PIXEL.wrongPenaltyMs / 1000} sn
            </span>
          )}
        </div>
        <Say {...SAY[view.phase]} />
      </aside>
      <div className={k.field}>
        <div className={s.screen} data-phase={view.phase}>
          <div
            key={view.screen}
            className={s.grid}
            style={{ '--n': screen.size } as never}
            data-look={screen.look}
            data-testid="pixel-grid"
          >
            {Array.from({ length: screen.size * screen.size }, (_, i) => {
              const dead = i === screen.odd
              return (
                <button
                  key={i}
                  type="button"
                  className={s.cell}
                  style={{ '--c': dead ? screen.dead : screen.base } as never}
                  data-dead={dead && (view.phase === 'hit' || view.phase === 'reveal')}
                  data-odd={TEST_FLAGS_ENABLED ? dead : undefined}
                  data-nudge={view.nudge?.cell === i ? (view.nudge.flip ? 'a' : 'b') : undefined}
                  aria-label="piksel"
                  onPointerDown={() => game.tap(i)}
                >
                  <span className={s.dot} />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
