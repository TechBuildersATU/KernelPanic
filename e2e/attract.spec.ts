import { expect, test } from './fixtures.ts'
import { expectTouchTarget, irisX, ROUND_URL, sounds } from './helpers.ts'

// The button screen with its eye (§2.1) and the hack intro (§2.2).

test.describe('Attract (the eye)', () => {
  test('shows the eye, the warning around it and a typed disclaimer', async ({ page }) => {
    await page.goto('/')
    const button = page.getByRole('button', { name: /Basmak üzeresin/ })
    await expect(button).toBeVisible()
    await expect(page.getByTestId('btn-panic')).toContainText('BASMAK ÜZERESİN')
    await expect(page.getByTestId('btn-panic')).toContainText('SONUÇLARINDAN SORUMLU DEĞİLİZ')
    await expect(page.getByTestId('system-status')).toHaveText('Sistem stabil')
    await expect(page.getByTestId('disclaimer')).toContainText('Basarsan format atılır.')
    await expectTouchTarget(page.getByTestId('btn-panic'), 400)
  })

  for (const how of ['tap', 'click'] as const) {
    test(`${how}: press → hack intro → countdown → first stage`, async ({ page }) => {
      await page.goto(ROUND_URL)
      const button = page.getByTestId('btn-panic')
      // watched from inside the page: with ?fastTimers the pressed button is gone within ~75 ms
      const pressed = page.waitForFunction(
        () =>
          document.querySelector('[data-testid="btn-panic"]')?.getAttribute('data-pressed') ===
          'true',
        null,
        { polling: 'raf' },
      )
      // the hack screen is up for well under a second here: it is watched the same way
      const hack = page.waitForFunction(
        () => {
          const screen = document.querySelector('[data-testid="hack"]')
          return (
            screen?.querySelector('h2')?.getAttribute('aria-label') === 'SYSTEM FAILURE' &&
            screen.textContent?.includes('Sistemi kurtarmak için 60 saniyen var.')
          )
        },
        null,
        { polling: 'raf' },
      )
      await (how === 'tap' ? button.tap() : button.click())
      await pressed
      await hack
      await expect(page.getByTestId('play')).toBeVisible({ timeout: 10_000 })
      expect(await sounds(page)).toEqual(expect.arrayContaining(['press', 'alarm', 'count', 'go']))
    })
  }

  test('a double tap starts one round only', async ({ page }) => {
    await page.goto(ROUND_URL)
    await page.getByTestId('btn-panic').dblclick()
    await expect(page.getByTestId('play')).toBeVisible({ timeout: 10_000 })
    expect((await sounds(page)).filter((s) => s === 'press')).toHaveLength(1)
    await expect(page.getByTestId('mission')).toContainText('1/5')
  })

  test('the round length from the settings is used (45 s)', async ({ page, context }) => {
    await context.addInitScript(() => localStorage.setItem('kernelpanic.roundSeconds', '45'))
    await page.goto(ROUND_URL)
    await page.getByTestId('btn-panic').tap()
    await expect(page.getByText('Sistemi kurtarmak için 45 saniyen var.')).toBeVisible()
    await expect(page.getByTestId('play-timer')).toHaveAttribute('aria-label', /4[45] saniye/, {
      timeout: 10_000,
    })
  })

  test('the eye squints at the visitor after 20 s without a touch, a touch calms it', async ({
    page,
  }) => {
    await page.clock.install()
    await page.goto('/')
    const button = page.getByTestId('btn-panic')
    await expect(button).toHaveAttribute('data-nudge', 'false')
    await page.clock.fastForward(21_000)
    await expect(button).toHaveAttribute('data-nudge', 'true')
    await page.getByTestId('disclaimer').tap()
    await expect(button).toHaveAttribute('data-nudge', 'false')
  })

  test('the eye looks somewhere else every 3 s, never twice the same way', async ({ page }) => {
    await page.clock.install()
    await page.goto('/')
    const eye = page.getByTestId('btn-panic')
    await expect(eye).toHaveAttribute('data-look', 'centre')
    // the first look comes soon after the screen opens
    await page.clock.fastForward(1_300)
    await expect(eye).not.toHaveAttribute('data-look', 'centre')
    for (let i = 0; i < 3; i++) {
      const look = (await eye.getAttribute('data-look')) ?? ''
      await page.clock.fastForward(2_000)
      await expect(eye).toHaveAttribute('data-look', look)
      await page.clock.fastForward(1_100)
      await expect(eye).not.toHaveAttribute('data-look', look)
    }
  })

  test('the eye looks where the screen is touched', async ({ page }) => {
    await page.goto('/')
    const eye = page.getByTestId('btn-panic')
    await expect(eye).toBeVisible()
    await page.touchscreen.tap(80, 420)
    await expect(eye).toHaveAttribute('data-look', 'touch')
    await expect.poll(() => irisX(eye)).toBeLessThan(200)
    await page.touchscreen.tap(1200, 420)
    await expect.poll(() => irisX(eye)).toBeGreaterThan(280)
  })
})

test('the logo chip stays inside the screen while the screens switch', async ({ page }) => {
  // a wider screen than the tablet: bars to the left and right of the 1280 × 800 game
  await page.setViewportSize({ width: 1600, height: 800 })
  await page.goto(ROUND_URL)
  await expect(page.getByTestId('btn-panic')).toBeVisible()
  // slow screen switches down, so they can be caught in the act
  await page.addStyleTag({
    content:
      '::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation-duration: 4s !important; }',
  })
  const bar = { x: 0, y: 0, width: 150, height: 800 }
  const empty = await page.screenshot({ clip: bar })
  await page.getByTestId('btn-panic').tap()
  await expect(page.locator('html[data-switching]')).toBeAttached()
  for (let i = 0; i < 4; i++) {
    // the header is lifted out of the game for the switch: its traces must not reach the bar
    expect(await page.screenshot({ clip: bar })).toEqual(empty)
    await page.waitForTimeout(250)
  }
})
