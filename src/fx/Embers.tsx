import { useEffect, useRef } from 'react'
import { readReduceEffects } from '@/app/settings'
import { prefersReducedMotion } from '@/app/timing'
import { STAGE_H, STAGE_W } from '@/components/stageSize'

// Overheat embers drifting up from the bottom edge. They live in the background, behind the
// panels, and fade in and out with the heat instead of popping on top of the screen.

interface Ember {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  life: number
  age: number
  hue: string
}

function spawn(): Ember {
  return {
    x: Math.random() * STAGE_W,
    y: STAGE_H + 10,
    vx: (Math.random() - 0.5) * 0.5,
    vy: -(0.6 + Math.random() * 1.4),
    r: 1.2 + Math.random() * 2.2,
    life: 2600 + Math.random() * 2400,
    age: 0,
    hue: Math.random() > 0.4 ? '255 122 42' : '255 176 32',
  }
}

export function Embers({ active }: { active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvas.current
    const g = el?.getContext('2d')
    if (!el || !g || !active || prefersReducedMotion() || readReduceEffects()) return
    el.width = STAGE_W
    el.height = STAGE_H
    let embers: Ember[] = []
    let raf = 0
    let last = performance.now()
    let carry = 0
    const loop = (t: number) => {
      const dt = Math.min(48, t - last)
      last = t
      carry += (dt / 1000) * 34
      while (carry >= 1) {
        embers.push(spawn())
        carry -= 1
      }
      g.clearRect(0, 0, STAGE_W, STAGE_H)
      embers = embers.filter((e) => {
        e.age += dt
        if (e.age >= e.life) return false
        e.x += e.vx * (dt / 16.67) + Math.sin((e.age + e.r * 400) / 520) * 0.25
        e.y += e.vy * (dt / 16.67)
        const fade = Math.sin((e.age / e.life) * Math.PI) // soft in, soft out
        g.fillStyle = `rgb(${e.hue} / ${0.75 * fade})`
        g.beginPath()
        g.arc(e.x, e.y, e.r, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = `rgb(${e.hue} / ${0.12 * fade})`
        g.beginPath()
        g.arc(e.x, e.y, e.r * 3.5, 0, Math.PI * 2)
        g.fill()
        return true
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [active])

  return <canvas ref={canvas} className="embers" data-active={active} aria-hidden="true" />
}
