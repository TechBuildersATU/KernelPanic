import { useEffect, useState, type ReactNode } from 'react'
import { STAGE_H, STAGE_W } from './stageSize'

export { STAGE_H, STAGE_W }

function fitScale(): number {
  return Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H)
}

interface Props {
  children: ReactNode
  /** "Efekt azalt" (settings): calmer glitches, no shakes or flashes. */
  reduceEffects?: boolean
}

/** Fixed 1280×800 stage (the booth tablet in landscape), scaled to fit any screen. */
export function Stage({ children, reduceEffects = false }: Props) {
  const [scale, setScale] = useState(fitScale)

  useEffect(() => {
    const onResize = () => setScale(fitScale())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div
      className="stage"
      data-stage
      data-reduce-effects={reduceEffects}
      style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
    >
      {children}
    </div>
  )
}
