import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { dur } from '@/app/timing'
import { playSfx } from '@/audio/sfx'
import { COOLING_MS } from '@/game/config'
import type { OverheatMode } from '@/game/engine'
import { coolingShiftMs } from '@/game/events'
import s from './Cooling.module.css'

const HOT = 96
const COOL = 60

interface Props {
  mode: OverheatMode
  onDone: (ok: boolean) => void
}

const seconds = (ms: number) => Math.abs(ms) / 1000

/** What the panel says before and after: the stakes depend on why the core overheated. */
function lines(mode: OverheatMode): { running: string; ok: string; fail: string } {
  const bonus = seconds(coolingShiftMs('slow', true))
  const penalty = seconds(coolingShiftMs('fast', false))
  return mode === 'slow'
    ? {
        running: `işlemci soğuyor · 3 saniye ekrana dokunma, +${bonus} sn kazan`,
        ok: `SOĞUTULDU · +${bonus} SN`,
        fail: 'SOĞUTULAMADI · süre kesilmedi',
      }
    : {
        running: `işlemci soğuyor · 3 saniye dokunma, dokunursan −${penalty} sn`,
        ok: 'SOĞUTULDU · devam',
        fail: `SİSTEM ISINDI · −${penalty} SN`,
      }
}

/**
 * SYSTEM OVERHEAT, the cooling (§3.1): "DOKUNMA!" — the core cools from 96 to 60 °C in three
 * seconds while nobody touches the screen. Too slow: holding still earns time, a touch costs
 * nothing. Too fast: holding still earns nothing, a touch costs time. Three seconds is a game
 * rule (never shortened in tests).
 */
export function Cooling({ mode, onDone }: Props) {
  const [result, setResult] = useState<boolean | null>(null)
  const ring = useRef<SVGCircleElement>(null)
  const temp = useRef<HTMLSpanElement>(null)
  const done = useEffectEvent(onDone)
  const cooled = useEffectEvent(() => setResult((r) => r ?? true))
  const text = lines(mode)

  useEffect(() => {
    const t0 = Date.now()
    let raf = 0
    const loop = () => {
      const t = Math.min(1, (Date.now() - t0) / COOLING_MS)
      ring.current?.style.setProperty('--t', String(t))
      if (temp.current) {
        const deg = Math.round(HOT - (HOT - COOL) * t)
        temp.current.textContent = `${deg} °C`
        temp.current.dataset.heat = deg > 80 ? 'hot' : deg > 68 ? 'warm' : 'cool'
      }
      if (t < 1) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const id = window.setTimeout(() => cooled(), COOLING_MS)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(id)
    }
  }, [])

  // the outcome shows for a moment, then the round moves on
  useEffect(() => {
    if (result === null) return
    // the time change itself sounds in Play (bonus / penalty); this is the cooling's own cue
    playSfx(result ? 'correct' : mode === 'fast' ? 'overheat' : 'wrong')
    const id = window.setTimeout(() => done(result), dur(1000))
    return () => window.clearTimeout(id)
  }, [result, mode])

  return (
    <section
      className={s.root}
      data-testid="cooling"
      data-result={result === null ? 'running' : result ? 'ok' : 'fail'}
      data-mode={mode}
    >
      {/* the whole stage listens: any touch spoils the cooling */}
      <div className={s.catcher} onPointerDown={() => setResult((r) => r ?? false)} />
      <p className={s.title}>DOKUNMA!</p>
      <div className={s.gauge}>
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle className={s.track} cx="100" cy="100" r="86" />
          <circle ref={ring} className={s.ring} cx="100" cy="100" r="86" />
        </svg>
        <span ref={temp} className={s.temp} data-heat="hot">
          {HOT} °C
        </span>
      </div>
      <p className={s.lead} data-testid="cooling-text">
        {result === null ? text.running : result ? text.ok : text.fail}
      </p>
    </section>
  )
}
