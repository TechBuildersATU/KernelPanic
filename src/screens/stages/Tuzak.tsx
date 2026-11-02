import { TEST_FLAGS_ENABLED } from '@/app/testFlags'
import { TUZAK } from '@/game/config'
import { seededRng } from '@/game/rng'
import { playerSeed, SALT, trapItemsFor } from '@/game/stages/players'
import { INKS, TRAP_RULES } from '@/game/stages/tuzak'
import { Dots, StepTimer } from './kit'
import { useRunner, type StageProps } from './runner'
import { TrapRunner } from './runners/tuzak'
import s from './Tuzak.module.css'

/** RENK TUZAĞI (stage 4): tap what the word says, then — the rule changes — its colour. */
export function Tuzak(props: StageProps) {
  const [game, view] = useRunner(
    props,
    (io) =>
      new TrapRunner(
        trapItemsFor(props.seed, props.player),
        TUZAK.limitMs[props.variant],
        props.glitch,
        seededRng(playerSeed(props.seed, SALT.tuzakButtons, props.player)),
        io,
      ),
  )
  const item = game.items[view.item]
  const showWord = view.phase === 'answer' || view.phase === 'right' || view.phase === 'wrong'

  return (
    <div className={s.game} data-testid="stage-tuzak" data-phase={view.phase} data-rule={view.rule}>
      <div className={s.top}>
        <p className={s.part}>
          BÖLÜM <b>{view.rule + 1}/2</b> · <span>{TRAP_RULES[view.rule]}</span>
        </p>
        <Dots marks={view.marks} label="Kelimeler" />
      </div>

      <div className={s.middle}>
        <p key={`rule-${view.rule}`} className={s.rule} data-rule={view.rule}>
          {TRAP_RULES[view.rule]}
        </p>
        {showWord ? (
          <p
            key={`word-${view.item}`}
            className={s.word}
            style={{ color: INKS[item.ink].color }}
            data-testid="trap-word"
          >
            {INKS[item.word].name}
          </p>
        ) : (
          <p className={`${s.word} ${s.ready}`}>{view.rule === 0 ? 'HAZIR' : '…'}</p>
        )}
      </div>

      <div className={s.row}>
        {INKS.map((ink, colour) => {
          const show =
            view.phase === 'right' && view.picked === colour
              ? 'ok'
              : view.phase === 'wrong' && colour === item.answer
                ? 'right'
                : view.phase === 'wrong' && view.picked === colour
                  ? 'no'
                  : undefined
          return (
            <button
              key={colour}
              type="button"
              className={s.swatch}
              style={{ '--sw': ink.color, '--place': view.order[colour] } as never}
              data-show={show}
              data-correct={
                TEST_FLAGS_ENABLED && view.phase === 'answer' ? colour === item.answer : undefined
              }
              aria-label={ink.name}
              onPointerDown={() => game.tap(colour)}
            />
          )
        })}
      </div>
      <div className={s.clock}>
        <StepTimer deadline={view.deadline} total={game.limitMs} />
      </div>

      {view.phase === 'warn' && (
        <div className={s.warn} role="alert" data-testid="rule-change">
          <b>⚠ KURAL DEĞİŞTİ</b>
          <span>artık yazının rengine bas</span>
        </div>
      )}
    </div>
  )
}
