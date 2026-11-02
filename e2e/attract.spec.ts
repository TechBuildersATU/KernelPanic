import { expect, test } from './fixtures.ts'
import { expectTouchTarget, ROUND_URL, sounds } from './helpers.ts'

// The red button screen (§2.1) and the hack intro (§2.2).

test.describe('Attract (red button)', () => {
  test('shows the button, the warning around it and a typed disclaimer', async ({ page }) => {
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

  test('the button nudges after 20 s without a touch, a touch calms it', async ({ page }) => {
    await page.clock.install()
    await page.goto('/')
    const button = page.getByTestId('btn-panic')
    await expect(button).toHaveAttribute('data-nudge', 'false')
    await page.clock.fastForward(21_000)
    await expect(button).toHaveAttribute('data-nudge', 'true')
    await page.getByTestId('disclaimer').tap()
    await expect(button).toHaveAttribute('data-nudge', 'false')
  })
})
