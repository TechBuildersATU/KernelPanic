import { useEffect, useEffectEvent, useState } from 'react'

/**
 * Calls `onIdle` after `ms` without a touch. Spread the returned handler on the screen root:
 * any touch restarts the wait.
 */
export function useIdle(ms: number, onIdle: () => void): { onPointerDown: () => void } {
  const [touched, setTouched] = useState(0)
  const fire = useEffectEvent(onIdle)

  useEffect(() => {
    const id = window.setTimeout(() => fire(), ms)
    return () => window.clearTimeout(id)
  }, [ms, touched])

  return { onPointerDown: () => setTouched((n) => n + 1) }
}
