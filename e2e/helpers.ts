import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Deterministic, quick round without surprise events (they have their own spec): seeded
 * stages, short animation waits (never the round clock or the step limits).
 */
export const ROUND_URL = '/?seed=4&fastTimers=1&event=none'

/** The same round with real animation waits (the stage's grade card stays up 1.9 s). */
export const REAL_URL = '/?seed=4&event=none'

/** Waits for entrance animations, then checks the touch area (≥ 64 × 64 px). */
export async function expectTouchTarget(locator: Locator, min = 64): Promise<void> {
  await expect(locator).toBeVisible()
  await locator.page().waitForTimeout(400)
  const box = await locator.boundingBox()
  expect(box?.width).toBeGreaterThanOrEqual(min)
  expect(box?.height).toBeGreaterThanOrEqual(min)
}

/** Presses the red button and waits for the first stage. */
export async function startRound(page: Page, url = ROUND_URL): Promise<void> {
  await page.goto(url)
  await page.getByTestId('btn-panic').tap()
  await expect(page.getByTestId('hack')).toBeVisible()
  await expect(page.getByTestId('play')).toBeVisible({ timeout: 10_000 })
}

/** Switches to the duel, both players press, and waits for the split screen. */
export async function startDuel(page: Page, url = ROUND_URL): Promise<void> {
  await page.goto(url)
  await page.getByTestId('mode-duel').tap()
  await page.getByTestId('btn-panic-1').tap()
  await page.getByTestId('btn-panic-2').tap()
  await expect(page.getByTestId('duel')).toBeVisible({ timeout: 10_000 })
}

export type StageId = 'piksel' | 'renk' | 'isin' | 'tuzak' | 'basma'

/** Where a round is played: the whole page, or one player's half of the duel. */
export type Scope = Page | Locator

/**
 * How to play: right on every step, wrong on every step, or wrong on the first `n` steps of a
 * stage and right on the rest. Per stage, or one rule for all.
 */
export type Play = 'right' | 'wrong' | { wrong: number }
export type Plan = Play | Partial<Record<StageId, Play>>

function playOf(plan: Plan, stage: StageId): Play {
  if (typeof plan === 'string' || 'wrong' in plan) return plan as Play
  return (plan as Partial<Record<StageId, Play>>)[stage] ?? 'right'
}

/** The live stage (its title card has gone), or null. */
async function liveStage(scope: Scope): Promise<StageId | null> {
  const host = scope.locator('[data-testid="stage"][data-live="true"]')
  if ((await host.count()) === 0) return null
  return (await host.first().getAttribute('data-stage')) as StageId
}

/** Steps of the stage already decided (its dots, right or missed). */
function settled(scope: Scope, stage: StageId): Promise<number> {
  return scope
    .getByTestId(`stage-${stage}`)
    .locator('li[data-mark="ok"], li[data-mark="miss"]')
    .count()
}

const over = async (scope: Scope) => (await scope.getByTestId('stage-end').count()) > 0

/** The stage has ended: its grade card is up, or (under ?fastTimers) already gone. */
const left = async (scope: Scope, stage: StageId) =>
  (await over(scope)) || (await scope.getByTestId(`stage-${stage}`).count()) === 0

/**
 * Taps a control of a live step. The step's own clock can end it a moment earlier (in a duel
 * the other half runs on while one is played); then there is nothing left to tap and the round
 * simply goes on.
 */
async function tapStep(control: Locator): Promise<void> {
  await control.tap({ timeout: 4_000 }).catch(() => undefined)
}

/** Waits until one more step of the stage is decided (or the stage is over). */
async function nextStep(scope: Scope, stage: StageId, before: number, timeout = 15_000) {
  await expect
    .poll(async () => (await left(scope, stage)) || (await settled(scope, stage)) > before, {
      timeout,
      intervals: [50],
    })
    .toBe(true)
}

/**
 * Plays one step of the live stage when it is waiting for the player; returns false when there
 * was nothing to do yet. `right` decides whether this step is played right.
 */
export async function step(
  page: Page,
  stage: StageId,
  right: boolean,
  scope: Scope = page,
): Promise<boolean> {
  const root = scope.getByTestId(`stage-${stage}`)
  if ((await root.count()) === 0) return false
  const phase = await root.getAttribute('data-phase')
  const before = await settled(scope, stage)
  if (stage === 'piksel') {
    if (phase !== 'find') return false
    await tapStep(root.locator(`[data-odd="${right}"]`).first())
    // a wrong pixel costs time but not the screen: let it run out
    await nextStep(scope, stage, before)
    return true
  }
  if (stage === 'renk') {
    const board = root.locator('[data-seq]')
    if ((await board.count()) === 0) return false
    const rest = ((await board.getAttribute('data-seq')) ?? '').split(',').map(Number)
    if (!right) {
      // a wrong colour ends the layer: wait for the next one
      const level = await root.getByTestId('stage-level').textContent()
      await tapStep(root.locator(`[data-k="${(rest[0] + 1) % 4}"]`))
      await expect
        .poll(
          async () =>
            (await left(scope, stage)) ||
            (await root.getByTestId('stage-level').textContent()) !== level,
          { intervals: [50] },
        )
        .toBe(true)
      return true
    }
    await tapStep(root.locator(`[data-k="${rest[0]}"]`))
    return true
  }
  if (stage === 'isin') {
    if (phase !== 'play') return false
    if (right) {
      const need = root.locator('[data-testid="mirror"][data-need="true"]')
      if ((await need.count()) > 0) await tapStep(need.first())
      return true
    }
    // run out the line's clock
    await nextStep(scope, stage, before)
    return true
  }
  if (stage === 'tuzak') {
    if (phase !== 'answer') return false
    await tapStep(root.locator(`[data-correct="${right}"]`).first())
    await nextStep(scope, stage, before)
    return true
  }
  // basma
  const eff = await root.getAttribute('data-eff')
  if (!eff) return false
  const button = root.getByTestId('btn-basma')
  const press = (right && eff !== 'basma') || (!right && eff === 'basma')
  if (press) {
    if (eff === 'bas' || eff === 'basma') await tapStep(button)
    else if (eff === 'uc') for (let i = 0; i < (right ? 3 : 1); i++) await tapStep(button)
    else if (eff === 'yesil') {
      // the green lasts half a second, longer than a tap from outside can take on a busy
      // machine: the page presses the button itself in the frame the colour comes on
      await root.evaluate(
        (el, colour) =>
          new Promise<void>((done) => {
            const frame = () => {
              const ring = el.querySelector<HTMLElement>('[data-testid="command-ring"]')
              if (ring?.dataset.c !== colour) return requestAnimationFrame(frame)
              const target = el.querySelector('[data-testid="btn-basma"]')!
              const init = { bubbles: true, pointerId: 1, isPrimary: true }
              target.dispatchEvent(new PointerEvent('pointerdown', init))
              target.dispatchEvent(new PointerEvent('pointerup', init))
              done()
            }
            frame()
          }),
        right ? 'g' : 'r',
      )
    } else if (eff === 'tut') {
      await button.dispatchEvent('pointerdown', { pointerId: 1, isPrimary: true })
      await page.waitForTimeout(right ? 2_200 : 500)
      await button.dispatchEvent('pointerup', { pointerId: 1, isPrimary: true })
    }
  }
  // BASMA! (or a command left to run out) waits for its window
  await nextStep(scope, stage, before)
  return true
}

/**
 * Plays the round from here to the end of stage `until` (default: the whole round, up to the
 * result — or, in a duel half, up to "waiting for the other player"). Emergency picks the safe
 * channel, the Overheat cooling is left alone (it holds).
 */
export async function playStages(
  page: Page,
  plan: Plan = 'right',
  until = 5,
  scope: Scope = page,
): Promise<void> {
  const done = new Map<StageId, number>()
  // stage `until` is over once its module in the HUD has its grade colour
  const graded = scope.locator(
    `[data-testid="play"] [data-cell="${until}"]:not([data-state="now"]):not([data-state="idle"])`,
  )
  for (let tick = 0; tick < 800; tick++) {
    if (await page.getByTestId('result').isVisible()) return
    if ((await scope.getByTestId('duel-waiting').count()) > 0) return
    if ((await graded.count()) > 0) return
    const ended = await over(scope)
    const safe = scope.getByTestId('btn-safe')
    if (await safe.isVisible()) {
      await safe.tap()
      continue
    }
    const stage = await liveStage(scope)
    if (stage && !ended) {
      const play = playOf(plan, stage)
      const n = done.get(stage) ?? 0
      const right = play === 'right' ? true : play === 'wrong' ? false : n >= play.wrong
      if (await step(page, stage, right, scope)) {
        done.set(stage, n + 1)
        continue
      }
    }
    await page.waitForTimeout(50)
  }
  throw new Error('the round did not finish')
}

/** Names of the sounds played so far (test builds count them). */
export function sounds(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __kpSounds?: string[] }).__kpSounds ?? [])
}
