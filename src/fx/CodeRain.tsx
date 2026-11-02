import { useEffect, useRef } from 'react'
import { STAGE_H, STAGE_W } from '@/components/stageSize'
import { readReduceEffects } from '@/app/settings'
import { prefersReducedMotion } from '@/app/timing'
import { PALETTE } from '@/game/palette'

// Falling hex / code characters behind every screen. Hex digits, brackets and Turkish letters
// instead of the usual katakana, so it reads as "our" system. ~30 fps, cheap enough for the
// booth tablet; a single still frame under reduced motion. One instance lives in the shared
// world (src/fx/World.tsx) for every screen.

const GLYPHS = '0123456789ABCDEF{}<>/;=#$ŞĞÜİÖÇ'

function rgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const CELL = 20
const FPS = 30

interface Props {
  /** Character colour (hex). Changes without restarting the animation. */
  color?: string
  /** 0–1 speed multiplier (the alarm rains faster). */
  speed?: number
}

export function CodeRain({ color = PALETTE.cyan, speed = 1 }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const live = useRef({ color, speed })
  useEffect(() => {
    live.current = { color, speed }
  }, [color, speed])

  useEffect(() => {
    const el = canvas.current
    const g = el?.getContext('2d')
    if (!el || !g) return
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    el.width = STAGE_W * ratio
    el.height = STAGE_H * ratio
    g.scale(ratio, ratio)
    g.font = `500 ${CELL - 4}px "JetBrains Mono", monospace`
    g.textBaseline = 'top'

    const columns = Math.ceil(STAGE_W / CELL)
    const drops = Array.from({ length: columns }, () => Math.random() * -40)
    const rates = Array.from({ length: columns }, () => 0.25 + Math.random() * 0.5)
    // colour and speed glide towards their targets: the world changes mood, it doesn't cut
    const shown = rgb(live.current.color)
    let speedNow = live.current.speed

    const frame = () => {
      g.fillStyle = 'rgb(9 14 29 / 0.16)'
      g.fillRect(0, 0, STAGE_W, STAGE_H)
      const target = rgb(live.current.color)
      for (let c = 0; c < 3; c++) shown[c] += (target[c] - shown[c]) * 0.06
      speedNow += (live.current.speed - speedNow) * 0.05
      g.fillStyle = `rgb(${shown[0] | 0} ${shown[1] | 0} ${shown[2] | 0})`
      for (let i = 0; i < columns; i++) {
        const y = drops[i] * CELL
        if (y > 0) g.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * CELL, y)
        drops[i] += rates[i] * speedNow
        if (y > STAGE_H && Math.random() > 0.97) drops[i] = Math.random() * -20
      }
    }

    if (prefersReducedMotion() || readReduceEffects()) {
      for (let i = 0; i < 60; i++) frame()
      return
    }
    let last = 0
    let raf = 0
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop)
      if (t - last < 1000 / FPS) return
      last = t
      frame()
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={canvas} className="code-rain" aria-hidden="true" />
}
