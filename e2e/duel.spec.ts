import type { Locator } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { expectTouchTarget, holdClock, irisX, playStages, ROUND_URL, startDuel } from './helpers.ts'

// The duel (§2.5): two eyes on the button screen, then the same five stages side by side.

test.describe('Duel: the button screen', () => {
  test('the mode switch shows two eyes, one per player', async ({ page }) => {
    await page.goto(ROUND_URL)
    await expect(page.getByTestId('mode-solo')).toHaveAttribute('aria-pressed', 'true')
    await expectTouchTarget(page.getByTestId('mode-duel'), 56)
    await page.getByTestId('mode-duel').tap()
    await expect(page.getByTestId('mode-duel')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('btn-panic')).toHaveCount(0)
    await expectTouchTarget(page.getByTestId('btn-panic-1'), 300)
    await expectTouchTarget(page.getByTestId('btn-panic-2'), 300)
    await expect(page.getByTestId('disclaimer')).toContainText('İkiniz de kendi gözünüze dokunun')
    await page.getByTestId('mode-solo').tap()
    await expect(page.getByTestId('btn-panic')).toBeVisible()
  })

  test('one press waits for the other player, then lets go after 12 s', async ({ page }) => {
    await page.clock.install()
    await page.goto(ROUND_URL)
    await page.getByTestId('mode-duel').tap()
    await page.getByTestId('btn-panic-1').tap()
    await expect(page.getByTestId('ready-1')).toHaveText('HAZIR ✓ · rakip bekleniyor')
    await expect(page.getByTestId('ready-2')).toHaveText('Dokununca hazırsın')
    // the ready player's eye takes their colour and looks across at the other player
    await expect(page.getByTestId('btn-panic-1')).toHaveAttribute('data-ready', 'true')
    await expect.poll(() => irisX(page.getByTestId('btn-panic-1'))).toBeGreaterThan(280)
    await expect(page.getByTestId('hack')).toHaveCount(0)
    await page.clock.fastForward(12_500)
    await expect(page.getByTestId('ready-1')).toHaveText('Dokununca hazırsın')
  })

  test('both press → the hack speaks to both → the split screen', async ({ page }) => {
    await page.goto(ROUND_URL)
    await page.getByTestId('mode-duel').tap()
    const hack = page.waitForFunction(
      () =>
        document
          .querySelector('[data-testid="hack"]')
          ?.textContent?.includes('İkinizin de 60 saniyesi var'),
      null,
      { polling: 'raf' },
    )
    await page.getByTestId('btn-panic-2').tap()
    await page.getByTestId('btn-panic-1').tap()
    await hack
    await expect(page.getByTestId('duel')).toBeVisible({ timeout: 10_000 })
    for (const side of [1, 2]) {
      const half = page.getByTestId(`half-${side}`)
      await expect(half.getByTestId('play')).toHaveAttribute('data-layout', 'half')
      await expect(half.getByTestId('mission')).toContainText('1/5')
      await expect(half.getByTestId('stage-pixel')).toBeVisible()
    }
  })
})

test.describe('Duel: the round', () => {
  test('each half takes only its own touches', async ({ page }) => {
    await page.clock.install()
    await startDuel(page)
    const left = page.getByTestId('half-1')
    const right = page.getByTestId('half-2')
    await expect(left.getByTestId('stage-pixel')).toHaveAttribute('data-phase', 'find', {
      timeout: 5_000,
    })
    // the same screen (size, colours), but the dead pixel is somewhere else on each half
    const odd = (half: typeof left) =>
      half
        .locator('[data-odd="true"]')
        .evaluate((el) => [...el.parentElement!.children].indexOf(el))
    const cells = (half: typeof left) => half.getByTestId('pixel-grid').locator('> *').count()
    // a wrong tap only costs time, the screen stays: the clock is held so that the left player's
    // screen cannot simply run out while the test looks
    await holdClock(page)
    expect(await cells(left)).toBe(await cells(right))
    expect(await odd(left)).not.toBe(await odd(right))
    await left.locator('[data-odd="false"]').first().tap()
    await expect(left.getByTestId('penalty')).toBeVisible()
    await expect(right.getByTestId('penalty')).toHaveCount(0)
    await right.locator('[data-odd="true"]').tap()
    await expect(right.getByTestId('stage-pixel')).toHaveAttribute('data-phase', 'hit')
    await expect(left.getByTestId('stage-pixel')).toHaveAttribute('data-phase', 'find')
    // the found pixel is shown, then the right player's next screen comes; the left one waits
    await page.clock.runFor(600)
    await expect(right.getByTestId('stage-level')).toContainText('2/5')
    await expect(left.getByTestId('stage-level')).toContainText('1/5')
    await expect(left.getByTestId('stage-pixel')).toHaveAttribute('data-phase', 'find')
  })

  test('who saves more wins: the first one done waits, then the duel result', async ({ page }) => {
    test.setTimeout(240_000)
    await startDuel(page)
    const left = page.getByTestId('half-1')
    const right = page.getByTestId('half-2')
    // the first one done gets their ending on their own half, like a solo round
    const ending = page.waitForFunction(
      () =>
        document
          .querySelector('[data-testid="half-1"] [data-testid="result-transition"]')
          ?.getAttribute('data-layout') === 'half',
      null,
      { polling: 'raf', timeout: 200_000 },
    )
    // player 1 plays everything right; player 2's clock and steps run on meanwhile
    await playStages(page, 'right', 5, left)
    await ending
    await expect(right.getByTestId('result-transition')).toHaveCount(0)
    await expect(left.getByTestId('duel-waiting')).toBeVisible({ timeout: 10_000 })
    await expect(left.getByTestId('duel-waiting')).toContainText('Rakip hâlâ oynuyor')
    await playStages(page, 'right', 5, right)
    await expect(page.getByTestId('duel-result')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('duel-winner')).toHaveText('OYUNCU 1 KAZANDI')
    // player 2's clock and steps ran on while player 1 played: player 1 saved more (how much
    // exactly depends on the machine's speed)
    const saved = async (n: 1 | 2) =>
      Number(
        /%([\d,]+)/
          .exec((await page.getByTestId(`duel-points-${n}`).textContent()) ?? '')?.[1]
          ?.replace(',', '.'),
      )
    expect(await saved(1)).toBeGreaterThan(await saved(2))
    await expect(page.getByTestId('duel-player-1')).toHaveAttribute('data-won', 'true')
    await expectTouchTarget(page.getByTestId('btn-restart'))
    await page.getByTestId('btn-restart').tap()
    await expect(page.getByTestId('attract')).toBeVisible()
    // the next pair finds the duel still selected
    await expect(page.getByTestId('btn-panic-1')).toBeVisible()
  })

  test('the house in the middle, held for a second, ends the duel', async ({ page }) => {
    await startDuel(page)
    const home = page.getByTestId('btn-home')
    await expectTouchTarget(home)
    // it sits on the seam under VS: clear of both halves' texts, over the cards' edges only
    const box = (await home.boundingBox())!
    const clear = async (el: Locator, slack: number) => {
      const other = (await el.boundingBox())!
      const overlapX = Math.min(box.x + box.width, other.x + other.width) - Math.max(box.x, other.x)
      const overlapY =
        Math.min(box.y + box.height, other.y + other.height) - Math.max(box.y, other.y)
      expect(overlapX <= slack || overlapY <= 0).toBe(true)
    }
    for (const side of [1, 2]) {
      const half = page.getByTestId(`half-${side}`)
      await clear(half.getByTestId('play-log'), 0)
      await clear(half.getByTestId('half-tag'), 0)
      await clear(half.locator('section').first(), 12)
    }
    await home.dispatchEvent('pointerdown')
    await page.waitForTimeout(400)
    await home.dispatchEvent('pointerup')
    await expect(page.getByTestId('duel')).toBeVisible()
    await home.dispatchEvent('pointerdown')
    await expect(page.getByTestId('attract')).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Duel: fair and different', () => {
  test('no Emergency in the duel, even when a test forces one', async ({ page }) => {
    test.setTimeout(120_000)
    await startDuel(page, '/?seed=4&fastTimers=1&event=emergency')
    const left = page.getByTestId('half-1')
    await playStages(page, 'right', 1, left)
    await expect(left.locator('[data-testid="stage"][data-stage="colours"]')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId('emergency')).toHaveCount(0)
    await expect(page.getByTestId('btn-safe')).toHaveCount(0)
  })

  test('every result transition fits one half (preview)', async ({ page }) => {
    for (const title of ['system-savior', 'error-404', 'kernel-panic', 'almost-a-legend']) {
      await page.goto(`/?transition=${title}&half=1`)
      const scene = page.getByTestId('half-1').getByTestId('result-transition')
      await expect(scene).toHaveAttribute('data-layout', 'half')
      const half = (await page.getByTestId('half-1').boundingBox())!
      const box = (await scene.boundingBox())!
      // zoomed to the half's width, centred on it
      expect(Math.abs(box.x + box.width / 2 - (half.x + half.width / 2))).toBeLessThan(4)
      expect(box.width).toBeLessThan(half.width * 1.3)
    }
  })
})

test('the right half mirrors the left: each card has its accent on the outer edge', async ({
  page,
}) => {
  await startDuel(page)
  const card = (side: 1 | 2) =>
    page
      .getByTestId(`half-${side}`)
      .getByTestId('stage-card')
      .evaluate((el: HTMLElement) => {
        const cs = getComputedStyle(el)
        const half = el.closest('[data-side]') as HTMLElement
        return {
          accent: [cs.borderLeftWidth, cs.borderRightWidth],
          outer:
            Number(half.dataset.side) === 1
              ? el.offsetLeft
              : half.clientWidth - el.offsetLeft - el.offsetWidth,
          width: el.offsetWidth,
        }
      })
  const one = await card(1)
  const two = await card(2)
  expect(one.accent).toEqual(['6px', '1px'])
  expect(two.accent).toEqual(['1px', '6px'])
  expect(two.outer).toBe(one.outer)
  expect(two.width).toBe(one.width)
})
