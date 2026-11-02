import { BASMA } from '../config'
import { shuffle, type Rng } from '../rng'

// BASMA DEDİK (stage 5, the final): the red button is the only control. Four steps bring every
// command once in a mixed order (BASILI TUT, 3 KEZ BAS, YEŞİLDE BAS, BASMA!), step five is always
// TERS MOD: BAS means "don't press", BASMA! means "press".

export type Command = 'bas' | 'basma' | 'tut' | 'uc' | 'yesil'

export interface Order {
  kind: Command
  inverted: boolean
  /** 0–4: the dot it fills (TERS MOD's two commands share the fifth). */
  step: number
}

export const COMMAND_TEXT: Readonly<Record<Command, string>> = {
  bas: 'BAS',
  basma: 'BASMA!',
  tut: 'BASILI TUT',
  uc: '3 KEZ BAS',
  yesil: 'YEŞİLDE BAS',
}

export const COMMAND_HINT: Readonly<Record<Command, string>> = {
  bas: 'bir kez dokun',
  basma: '2 saniye dokunma',
  tut: '2 saniye bırakma',
  uc: 'üç kez dokun',
  yesil: 'halka yeşil yanınca dokun',
}

export function makeOrders(rng: Rng): Order[] {
  let four: Command[]
  do {
    four = shuffle(['tut', 'uc', 'yesil', 'basma'] as Command[], rng)
  } while (four[0] === 'basma')
  return [
    ...four.map((kind, step) => ({ kind, inverted: false, step })),
    ...shuffle(['bas', 'basma'] as Command[], rng).map((kind) => ({
      kind,
      inverted: true,
      step: 4,
    })),
  ]
}

/** What the player actually has to do. */
export function effectiveCommand(order: Order): Command {
  if (!order.inverted) return order.kind
  return order.kind === 'bas' ? 'basma' : 'bas'
}

export function windowOf(order: Order): number {
  if (order.inverted) return BASMA.invertedMs[order.kind === 'bas' ? 'bas' : 'basma']
  return BASMA.windowMs[order.kind]
}

/** YEŞİLDE BAS: the ring's colour `t` ms after the command appeared. */
export function ringColourAt(t: number): 'r' | 'a' | 'g' {
  const p = ((t % BASMA.ringCycleMs) + BASMA.ringCycleMs) % BASMA.ringCycleMs
  return p < 700 ? 'r' : p < 1000 ? 'a' : 'g'
}
