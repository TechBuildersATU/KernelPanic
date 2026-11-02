import { useEffect, useState } from 'react'

const NOISE = '#$%&@!?/\\<>{}[]01ŞĞÜİÖÇ'
const TICK_MS = 28

/**
 * Letters settle from noise into `text`, left to right, within about `durationMs` (SYSTEM
 * FAILURE, every question "decoding" in, the glitched question, result titles).
 * Returns '' until `run` is true.
 */
export function useScramble(text: string, run: boolean, durationMs = 700): string {
  const [settled, setSettled] = useState(0)
  const [tick, setTick] = useState(0)
  const perTick = Math.max(1, Math.ceil(text.length / (durationMs / TICK_MS)))

  useEffect(() => {
    if (!run || settled >= text.length) return
    const id = window.setTimeout(() => {
      setTick((t) => t + 1)
      setSettled((n) => n + perTick)
    }, TICK_MS)
    return () => window.clearTimeout(id)
  }, [run, settled, text.length, perTick])

  if (!run) return ''
  if (settled >= text.length) return text
  return [...text]
    .map((ch, i) => (i < settled || ch === ' ' ? ch : NOISE[(i * 7 + tick * 13) % NOISE.length]))
    .join('')
}
