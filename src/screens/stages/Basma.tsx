import { useEffect, useRef } from 'react'
import { TEST_FLAGS_ENABLED } from '@/app/testFlags'
import { COMMAND_HINT, COMMAND_TEXT } from '@/game/stages/basma'
import { ordersFor } from '@/game/stages/players'
import { Dots, StepTimer } from './kit'
import { useRunner, type StageProps } from './runner'
import { PressRunner } from './runners/basma'
import s from './Basma.module.css'

/** BASMA DEDİK (stage 5, the final): the red button is the only control. */
export function Basma(props: StageProps) {
  const [game, view] = useRunner(
    props,
    (io) => new PressRunner(ordersFor(props.seed, props.player), io),
  )
  const ring = useRef<HTMLDivElement>(null)

  // the ring follows the command every frame: hold progress, taps, or the traffic light
  const running = view.phase === 'cmd'
  useEffect(() => {
    const el = ring.current
    if (!running || !el) return
    let raf = 0
    const loop = () => {
      const frame = game.frame()
      el.style.setProperty('--p', String(frame.progress))
      el.dataset.c = frame.colour
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [running, view.idx, game])

  const order = view.order
  const inverted = view.phase === 'ters' || (order?.inverted ?? false)
  let text = '· · ·'
  let hint = '6 komut · son ikisi TERS MOD'
  if (view.phase === 'ters') {
    text = 'TERS MOD'
    hint = 'artık tersini yap'
  } else if (order) {
    text = COMMAND_TEXT[order.kind]
    hint =
      view.phase === 'ok'
        ? '✓ tamam'
        : view.phase === 'miss'
          ? view.why
          : order.inverted
            ? 'ters mod: tersini yap'
            : COMMAND_HINT[order.kind]
  }

  return (
    <div
      className={s.game}
      data-testid="stage-basma"
      data-phase={view.phase}
      data-ters={inverted}
      data-eff={TEST_FLAGS_ENABLED && running ? (view.eff ?? undefined) : undefined}
    >
      <Dots marks={view.marks} label="Komutlar" />
      <p className={s.mode} data-on={inverted}>
        TERS MOD
      </p>
      <p
        key={`${view.idx}-${view.phase === 'ters'}`}
        className={s.command}
        data-tone={
          view.phase === 'ok' ? 'ok' : view.phase === 'miss' ? 'bad' : inverted ? 'inv' : ''
        }
        data-testid="command"
        aria-live="polite"
      >
        {text}
      </p>
      <p className={s.hint}>
        <span key={hint}>{hint}</span>
      </p>
      <div className={s.buttonWrap}>
        <div ref={ring} className={s.ring} data-testid="command-ring" />
        <button
          type="button"
          className={s.button}
          data-down={view.down}
          data-testid="btn-basma"
          aria-label="Kırmızı buton"
          onPointerDown={(e) => {
            try {
              e.currentTarget.setPointerCapture(e.pointerId)
            } catch {
              // synthetic pointers (tests) cannot be captured
            }
            game.press()
          }}
          onPointerUp={() => game.release()}
          onPointerCancel={() => game.release()}
          onLostPointerCapture={() => game.release()}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
      <div className={s.clock}>
        <StepTimer deadline={view.deadline} total={view.window} />
      </div>
    </div>
  )
}
