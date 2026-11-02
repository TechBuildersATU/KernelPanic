import { useId } from 'react'
import { TEST_FLAGS_ENABLED } from '@/app/testFlags'
import { BEAM } from '@/game/config'
import { seededRng, stageSeed } from '@/game/rng'
import { makeBeamLine } from '@/game/stages/beam'
import { SALT } from '@/game/stages/players'
import { Dots, Level, Say, StepTimer } from './kit'
import { TONES, useRunner, type StageProps } from './runner'
import { BeamRunner } from './runners/beam'
import k from './Stage.module.css'
import s from './BeamStage.module.css'

const TAGS = ['kolay', 'orta', 'zor']
const SAY = {
  wait: { text: 'hazırlan', tone: '' },
  play: { text: 'aynaya dokun', tone: 'go' },
  linked: { text: 'hat bağlandı', tone: 'ok' },
  reveal: { text: 'süre bitti · yol buydu', tone: 'bad' },
  done: { text: 'veri ulaştı', tone: 'ok' },
}

/**
 * IŞIN YOLU (stage 3): turn the mirrors until the data beam reaches the server; three lines. In
 * the duel both players get the very same lines (another line could be an easier one).
 */
export function BeamStage(props: StageProps) {
  const [game, view] = useRunner(props, (io) => {
    const rng = seededRng(stageSeed(props.seed, SALT.beam))
    const lines = BEAM.lines[props.variant].map((size) => makeBeamLine(size, rng))
    const flips = seededRng(stageSeed(props.seed, SALT.beamGlitch))
    return new BeamRunner(lines, props.glitch, flips, io)
  })
  const glow = `glow${useId().replace(/[^a-z0-9]/gi, '')}`
  const line = game.lines[view.line]
  const { beam, orient } = view
  const linked = beam.ok
  const end = beam.points.at(-1)!
  const points = beam.points.map(([x, y], i) => `${i === 0 ? x + 0.28 : x},${y}`).join(' ')

  return (
    <div className={k.game} data-testid="stage-beam" data-phase={view.phase} data-line={view.line}>
      <aside className={k.side}>
        <Level
          label="HAT"
          index={view.line}
          total={game.lines.length}
          tag={TAGS[view.line]}
          tone={TONES[view.line]}
        />
        <Say {...SAY[view.phase]} />
        <Dots marks={view.marks} label="Hatlar" />
        <StepTimer deadline={view.deadline} total={BEAM.limitsMs[view.line]} />
        <p className={k.info}>{view.taps} dokunuş</p>
      </aside>
      <div className={k.field}>
        <svg
          key={view.line}
          className={s.board}
          viewBox={`-1.6 -1.6 ${line.cols + 2.2} ${line.rows + 2.2}`}
          data-linked={linked}
          data-phase={view.phase}
          aria-label="Işın yolu"
        >
          <defs>
            <filter id={glow} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.07" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect
            className={s.plate}
            x={-0.5}
            y={-0.5}
            width={line.cols}
            height={line.rows}
            rx={0.14}
          />
          {Array.from({ length: line.cols - 1 }, (_, x) => (
            <line
              key={`c${x}`}
              className={s.gridLine}
              x1={x + 0.5}
              y1={-0.5}
              x2={x + 0.5}
              y2={line.rows - 0.5}
            />
          ))}
          {Array.from({ length: line.rows - 1 }, (_, y) => (
            <line
              key={`r${y}`}
              className={s.gridLine}
              x1={-0.5}
              y1={y + 0.5}
              x2={line.cols - 0.5}
              y2={y + 0.5}
            />
          ))}
          {line.walls.map((w) => (
            <g key={`w${w.x},${w.y}`} transform={`translate(${w.x} ${w.y})`}>
              <rect className={s.wall} x={-0.42} y={-0.42} width={0.84} height={0.84} rx={0.08} />
              {[-0.25, 0, 0.25].map((d) => (
                <line key={d} className={s.hatch} x1={d - 0.3} y1={0.3} x2={d + 0.3} y2={-0.3} />
              ))}
            </g>
          ))}

          <g transform={`translate(-1 ${line.entry})`}>
            <rect className={s.emitter} x={-0.36} y={-0.26} width={0.66} height={0.52} rx={0.1} />
            <circle className={s.emitterDot} cx={0.2} cy={0} r={0.08} />
          </g>
          <g transform={`translate(${line.server.x} ${line.server.y})`}>
            <rect className={s.serverBox} x={-0.32} y={-0.36} width={0.64} height={0.72} rx={0.1} />
            {[-0.17, 0, 0.17].map((d) => (
              <rect
                key={d}
                className={s.serverBar}
                x={-0.19}
                y={d - 0.035}
                width={0.38}
                height={0.07}
              />
            ))}
          </g>

          <polyline className={s.beam} points={points} filter={`url(#${glow})`} />
          <polyline className={s.flow} points={points} />
          {!linked && <circle className={s.blocked} cx={end[0]} cy={end[1]} r={0.11} />}

          {line.mirrors.map((m, i) => {
            const angle = (line.start[i] === '/' ? -45 : 45) + view.turns[i] * 90
            return (
              <g
                key={`m${m.x},${m.y}`}
                className={s.spot}
                transform={`translate(${m.x} ${m.y})`}
                data-testid="mirror"
                data-need={
                  TEST_FLAGS_ENABLED ? m.solution !== null && m.solution !== orient[i] : undefined
                }
                onPointerDown={() => game.tap(i)}
              >
                <circle className={s.hit} r={0.46} />
                <circle className={s.ring} r={0.36} />
                <g className={s.mirror} style={{ rotate: `${angle}deg` }}>
                  <rect x={-0.38} y={-0.05} width={0.76} height={0.1} rx={0.05} />
                </g>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
