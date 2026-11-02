import { useRef, type PointerEvent } from 'react'

/**
 * Double-tap guard: presses closer together than `guardMs` run the action once. Arguments are
 * passed through (e.g. the answer position).
 */
export function usePressGuard<A extends unknown[]>(
  action: ((...args: A) => void) | undefined,
  guardMs = 400,
): (...args: A) => void {
  const last = useRef(Number.NEGATIVE_INFINITY)
  return (...args: A) => {
    const now = performance.now()
    if (now - last.current < guardMs) return
    last.current = now
    action?.(...args)
  }
}

/** Press-and-hold (the logo for 3 s → hidden settings). Releasing early does nothing. */
export function useLongPress(action: () => void, ms: number) {
  const timer = useRef<number | undefined>(undefined)
  const cancel = () => window.clearTimeout(timer.current)
  return {
    onPointerDown: (e: PointerEvent) => {
      e.preventDefault()
      cancel()
      timer.current = window.setTimeout(action, ms)
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  }
}
