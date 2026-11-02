import { getTestFlags } from './testFlags'

/**
 * Scripted animation waits. ?fastTimers=1 makes them ten times shorter for tests. Never use it
 * for the round clock or answer limits: those are game rules.
 */
export function dur(ms: number): number {
  return getTestFlags().fastTimers ? Math.round(ms / 10) : ms
}

/** Resolves after `ms`; rejects with an AbortError when the screen unmounts first. */
export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason)
    const id = window.setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(id)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}

/** Use as `.catch(ignoreAbort)` on screen sequences cancelled by unmounting. */
export function ignoreAbort(error: unknown): void {
  if (error instanceof DOMException && error.name === 'AbortError') return
  console.error(error)
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}
