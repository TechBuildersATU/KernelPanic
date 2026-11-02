// Booth tablets differ. For the first seconds after launch the app watches how fast frames come;
// on a device that struggles it marks <html data-perf="low">, and the heaviest background motion
// steps down (the floor grid stops drifting, the code rain falls at half the frame rate, the
// title's glitch rests). The game itself — stages, clocks, the eye — stays exactly the same.

/** A median frame slower than this (about 40 fps) means the device struggles. */
export const SLOW_FRAME_MS = 25

/** How long the frames are watched, after the first second (start-up work) is skipped. */
const WATCH_MS = 4000
const SKIP_MS = 1000

export function medianFrame(intervals: readonly number[]): number {
  if (intervals.length === 0) return 0
  const sorted = [...intervals].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

export function isLowPerf(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.perf === 'low'
}

function markLow(): void {
  document.documentElement.dataset.perf = 'low'
}

/** Watches the first seconds of frames (or, with `forced`, steps down at once: tests). */
export function watchFrameRate(forced = false): void {
  if (forced) {
    markLow()
    return
  }
  const intervals: number[] = []
  let start = 0
  let last = 0
  const tick = (t: number) => {
    if (!start) start = t
    if (last && t - start > SKIP_MS) intervals.push(t - last)
    last = t
    if (t - start < SKIP_MS + WATCH_MS) {
      requestAnimationFrame(tick)
      return
    }
    if (medianFrame(intervals) > SLOW_FRAME_MS) markLow()
  }
  requestAnimationFrame(tick)
}
