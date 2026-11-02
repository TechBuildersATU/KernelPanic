import { TEST_FLAGS_ENABLED } from '@/app/testFlags'
import { RENK } from '@/game/config'
import { seededRng } from '@/game/rng'
import { colourLayersFor, playerSeed, SALT } from '@/game/stages/players'
import { PADS } from '@/game/stages/renk'
import { Dots, Level, Say, StepTimer } from './kit'
import { TONES, useRunner, type StageProps } from './runner'
import { ColourRunner } from './runners/renk'
import k from './Stage.module.css'
import s from './Renk.module.css'

const TAGS = ['kolay', 'hızlı', 'yer değiştirir']
const SAY = {
  wait: { text: 'hazırlan', tone: '' },
  show: { text: 'izle', tone: '' },
  swap: { text: 'renkler yer değiştirdi!', tone: 'warn' },
  input: { text: 'şimdi sen', tone: 'go' },
  pass: { text: 'katman geçildi', tone: 'ok' },
  fail: { text: 'yanlış renk', tone: 'bad' },
  done: { text: 'duvar kapandı', tone: 'ok' },
}

/** DÖRT RENK (stage 2): watch the pads light up, then repeat them; three layers. */
export function Renk(props: StageProps) {
  const [game, view] = useRunner(
    props,
    (io) =>
      new ColourRunner(
        colourLayersFor(props.seed, props.variant, props.glitch, props.player),
        seededRng(playerSeed(props.seed, SALT.renkSwap, props.player)),
        io,
      ),
  )

  return (
    <div className={k.game} data-testid="stage-renk" data-phase={view.phase}>
      <aside className={k.side}>
        <Level
          label="KATMAN"
          index={view.layer}
          total={game.layers.length}
          tag={TAGS[view.layer]}
          tone={TONES[view.layer]}
        />
        <Say {...SAY[view.phase]} />
        <Dots marks={view.marks} label="Renkler" />
        <StepTimer deadline={view.deadline} total={RENK.idleMs} />
      </aside>
      <div className={k.field}>
        <div
          className={s.board}
          data-input={view.phase === 'input'}
          data-seq={TEST_FLAGS_ENABLED && view.phase === 'input' ? view.rest.join(',') : undefined}
        >
          {PADS.map((pad, id) => {
            const place = view.order[id]
            return (
              <button
                key={id}
                type="button"
                className={s.pad}
                style={
                  { '--c': pad.color, '--x': place % 2, '--y': Math.floor(place / 2) } as never
                }
                data-k={id}
                data-lit={view.lit === id}
                data-wrong={view.wrong === id && view.phase === 'fail'}
                aria-label={pad.name}
                onPointerDown={() => game.tap(id)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
