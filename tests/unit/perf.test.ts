import { afterEach, describe, expect, it, vi } from 'vitest'
import { isLowPerf, medianFrame, SLOW_FRAME_MS, watchFrameRate } from '@/app/perf'

// A slow booth tablet gets lighter background motion (app/perf.ts).

/** Plays frames `every` ms apart through a fake requestAnimationFrame. */
function frames(every: number, count = 400) {
  let t = 0
  const queue: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => queue.push(cb))
  watchFrameRate()
  for (let i = 0; i < count && queue.length; i++) {
    t += every
    queue.shift()!(t)
  }
}

describe('frame-rate watch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete document.documentElement.dataset.perf
  })

  it('takes the median frame, so a few hiccups do not count', () => {
    expect(medianFrame([16, 17, 16, 120, 16])).toBe(16)
    expect(medianFrame([])).toBe(0)
  })

  it('a device at 60 fps keeps everything', () => {
    frames(16.7)
    expect(isLowPerf()).toBe(false)
  })

  it('a device at 30 fps steps down to the light mode', () => {
    frames(33)
    expect(isLowPerf()).toBe(true)
    expect(document.documentElement.dataset.perf).toBe('low')
  })

  it('the threshold sits around 40 fps', () => {
    expect(SLOW_FRAME_MS).toBeGreaterThan(1000 / 60)
    expect(SLOW_FRAME_MS).toBeLessThan(1000 / 30)
  })

  it('?perf=low steps down at once (tests)', () => {
    watchFrameRate(true)
    expect(isLowPerf()).toBe(true)
  })
})
