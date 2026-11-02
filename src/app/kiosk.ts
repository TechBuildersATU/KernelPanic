// Booth tablet helpers, started by the first press of the eye (a user gesture):
// keep the screen awake and, in a plain browser tab, go full screen. The APK does both
// natively (MainActivity); in the installed PWA the manifest already asks for full screen.

let lock: WakeLockSentinel | null = null
let watching = false

async function requestLock(): Promise<void> {
  try {
    if (!('wakeLock' in navigator) || (lock && !lock.released)) return
    lock = await navigator.wakeLock.request('screen')
  } catch {
    // not allowed (battery saver, insecure context): the tablet's own setting still applies
  }
}

/** Keeps the screen on; the lock is dropped when the page is hidden, so take it again. */
export function keepAwake(): void {
  void requestLock()
  if (watching) return
  watching = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void requestLock()
  })
}

/** Full screen in a browser tab (not in dev, not when already full screen or installed). */
export function enterFullscreen(): void {
  if (import.meta.env.DEV || document.fullscreenElement) return
  if (window.matchMedia?.('(display-mode: fullscreen), (display-mode: standalone)').matches) return
  document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {})
}
