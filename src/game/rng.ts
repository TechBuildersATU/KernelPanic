/** A random number source in [0, 1). Seeded in tests (?seed=N), Math.random at the booth. */
export type Rng = () => number

/** Small, fast seeded generator (mulberry32): the same seed always gives the same round. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A new shuffled copy (Fisher–Yates). */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function pickOne<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)]
}

/** Turns the round seed into one stage's own seed (`salt`: which stage, which part of it). */
export function stageSeed(seed: number, salt: number): number {
  return (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0
}
