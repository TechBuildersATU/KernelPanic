import { ORDERS } from '../config'
import { shuffle, type Rng } from '../rng'

// BASMA DEDİK (stage 5, the final): the red button is the only control. Four steps bring every
// command once in a mixed order (BASILI TUT, 3 KEZ BAS, YEŞİLDE BAS, BASMA!), step five is always
// TERS MOD: BAS means "don't press", BASMA! means "press".

export type Command = 'press' | 'dontPress' | 'hold' | 'triple' | 'green'

export interface Order {
  kind: Command
  inverted: boolean
  /** 0–4: the dot it fills (TERS MOD's two commands share the fifth). */
  step: number
}

export const COMMAND_TEXT: Readonly<Record<Command, string>> = {
  press: 'BAS',
  dontPress: 'BASMA!',
  hold: 'BASILI TUT',
  triple: '3 KEZ BAS',
  green: 'YEŞİLDE BAS',
}

export const COMMAND_HINT: Readonly<Record<Command, string>> = {
  press: 'bir kez dokun',
  dontPress: '2 saniye dokunma',
  hold: '2 saniye bırakma',
  triple: 'üç kez dokun',
  green: 'halka yeşil yanınca dokun',
}

export function makeOrders(rng: Rng): Order[] {
  let four: Command[]
  do {
    four = shuffle(['hold', 'triple', 'green', 'dontPress'] as Command[], rng)
  } while (four[0] === 'dontPress')
  return [
    ...four.map((kind, step) => ({ kind, inverted: false, step })),
    ...shuffle(['press', 'dontPress'] as Command[], rng).map((kind) => ({
      kind,
      inverted: true,
      step: 4,
    })),
  ]
}

/** What the player actually has to do. */
export function effectiveCommand(order: Order): Command {
  if (!order.inverted) return order.kind
  return order.kind === 'press' ? 'dontPress' : 'press'
}

export function windowOf(order: Order): number {
  if (order.inverted) return ORDERS.invertedMs[order.kind === 'press' ? 'press' : 'dontPress']
  return ORDERS.windowMs[order.kind]
}

/** YEŞİLDE BAS: the ring's colour `t` ms after the command appeared. */
export function ringColourAt(t: number): 'r' | 'a' | 'g' {
  const p = ((t % ORDERS.ringCycleMs) + ORDERS.ringCycleMs) % ORDERS.ringCycleMs
  return p < 700 ? 'r' : p < 1000 ? 'a' : 'g'
}
