import type { LineSize } from '../config'
import { shuffle, type Rng } from '../rng'

// IŞIN YOLU (stage 3): the data beam leaves the emitter on the left and has to reach the server.
// Tapping a mirror turns it ( / ↔ \ ). Lines are generated path-first — mirrors are put on the
// turns of a random path, then scrambled — so every line can be solved.

export type Mirror = '/' | '\\'

export interface MirrorSpot {
  x: number
  y: number
  /** The orientation on the solution path; null for a decoy off the path. */
  solution: Mirror | null
}

export interface BeamLine {
  cols: number
  rows: number
  /** Row of the emitter, just left of column 0. */
  entry: number
  /** The server sits just outside the grid: x === cols (right), y === -1 (top) or rows (bottom). */
  server: { x: number; y: number }
  mirrors: readonly MirrorSpot[]
  walls: readonly { x: number; y: number }[]
  /** Scrambled starting orientations, one per mirror (the line is never solved at the start). */
  start: readonly Mirror[]
}

export interface Beam {
  /** Grid points the beam passes, from the emitter (x = -1) on. */
  points: [number, number][]
  ok: boolean
}

export function traceBeam(line: BeamLine, orient: readonly Mirror[]): Beam {
  const at = new Map(line.mirrors.map((m, i) => [`${m.x},${m.y}`, i]))
  const walls = new Set(line.walls.map((w) => `${w.x},${w.y}`))
  let x = 0
  let y = line.entry
  let dx = 1
  let dy = 0
  const points: [number, number][] = [[-1, line.entry]]
  for (let n = 0; n < 400; n++) {
    if (x < 0 || x >= line.cols || y < 0 || y >= line.rows) {
      const ok = x === line.server.x && y === line.server.y
      points.push(ok ? [x, y] : [x - dx * 0.5, y - dy * 0.5])
      return { points, ok }
    }
    if (walls.has(`${x},${y}`)) {
      points.push([x - dx * 0.5, y - dy * 0.5])
      return { points, ok: false }
    }
    const i = at.get(`${x},${y}`)
    if (i !== undefined) {
      points.push([x, y])
      const s = orient[i] === '/' ? -1 : 1
      ;[dx, dy] = [s * dy, s * dx]
    }
    x += dx
    y += dy
  }
  return { points, ok: false }
}

/** The orientations of the solution (decoys keep theirs). */
export function solutionOf(line: BeamLine, orient: readonly Mirror[]): Mirror[] {
  return line.mirrors.map((m, i) => m.solution ?? orient[i])
}

export function makeBeamLine(size: LineSize, rng: Rng): BeamLine {
  const [cols, rows, turns, decoys, wallCount] = size
  const rint = (n: number) => Math.floor(rng() * n)
  for (let tries = 0; tries < 500; tries++) {
    const pairs = Math.floor(turns / 2)
    const odd = turns % 2 === 1
    const verticals = pairs + (odd ? 1 : 0)
    const pool = Array.from({ length: cols - 1 }, (_, i) => i + 1)
    if (pool.length < verticals) break
    const columns = shuffle(pool, rng)
      .slice(0, verticals)
      .sort((a, b) => a - b)
    const entry = rint(rows)
    const solution = new Map<string, Mirror>()
    const onPath = new Set<string>()
    const mark = (px: number, py: number) => onPath.add(`${px},${py}`)
    let x = 0
    let y = entry
    let server = { x: cols, y: entry }
    for (let j = 0; j < verticals; j++) {
      const cx = columns[j]
      for (; x < cx; x++) mark(x, y)
      if (odd && j === verticals - 1) {
        // the last turn sends the beam out of the top or the bottom
        const dir = y === 0 ? 1 : y === rows - 1 ? -1 : rng() < 0.5 ? -1 : 1
        solution.set(`${cx},${y}`, dir > 0 ? '\\' : '/')
        for (let yy = y; yy >= 0 && yy < rows; yy += dir) mark(cx, yy)
        server = { x: cx, y: dir > 0 ? rows : -1 }
        x = cols
        break
      }
      let ny: number
      do {
        ny = rint(rows)
      } while (ny === y)
      const dir = ny > y ? 1 : -1
      const m: Mirror = dir > 0 ? '\\' : '/'
      solution.set(`${cx},${y}`, m)
      solution.set(`${cx},${ny}`, m)
      for (let yy = y; yy !== ny + dir; yy += dir) mark(cx, yy)
      y = ny
      x = cx + 1
    }
    if (!odd) {
      for (; x < cols; x++) mark(x, y)
      server = { x: cols, y }
    }

    const free: { x: number; y: number }[] = []
    for (let fy = 0; fy < rows; fy++) {
      for (let fx = 0; fx < cols; fx++) if (!onPath.has(`${fx},${fy}`)) free.push({ x: fx, y: fy })
    }
    if (free.length < decoys + wallCount) continue
    const spare = shuffle(free, rng)
    const mirrors: MirrorSpot[] = [
      ...[...solution].map(([key, m]) => {
        const [mx, my] = key.split(',').map(Number)
        return { x: mx, y: my, solution: m }
      }),
      ...spare.slice(0, decoys).map((c) => ({ ...c, solution: null })),
    ]
    const walls = spare.slice(decoys, decoys + wallCount)
    const decoyOrient = mirrors.map((): Mirror => (rng() < 0.5 ? '/' : '\\'))
    const line: BeamLine = { cols, rows, entry, server, mirrors, walls, start: [] }
    if (!traceBeam(line, solutionOf(line, decoyOrient)).ok) continue
    for (let s = 0; s < 40; s++) {
      const start = mirrors.map((m, i): Mirror =>
        m.solution ? (rng() < 0.5 ? '/' : '\\') : decoyOrient[i],
      )
      if (!traceBeam(line, start).ok) return { ...line, start }
    }
  }
  throw new Error(`no beam line for ${size.join('×')}`)
}
