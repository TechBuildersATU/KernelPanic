import { expect, test } from './fixtures.ts'

// The stage, fonts, logo and kiosk rules on the booth tablet profile.

test('opens on the 1280×800 stage without errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto('/')
  await expect(page.getByTestId('attract')).toBeVisible()

  const box = await page.locator('[data-stage]').boundingBox()
  expect(box).toMatchObject({ x: 0, y: 0, width: 1280, height: 800 })
  expect(errors).toEqual([])
})

test('logo and Turkish fonts are loaded', async ({ page }) => {
  await page.goto('/')
  const logo = page.getByRole('img', { name: 'ATÜ TechBuilders' })
  await expect(logo).toBeVisible()
  expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)

  // Faces load lazily, so load each bundled weight first; Turkish needs latin + latin-ext.
  const fonts = await page.evaluate(async () => {
    const turkish = 'ŞĞÜİÖÇşğüıöç'
    const result: Record<string, number | boolean> = {}
    for (const font of [
      '500 32px "Chakra Petch"',
      '600 32px "Chakra Petch"',
      '700 32px "Chakra Petch"',
      '500 32px "JetBrains Mono"',
      '700 32px "JetBrains Mono"',
    ]) {
      result[font] = (await document.fonts.load(font, turkish)).length
      result[`${font} ok`] = document.fonts.check(font, turkish)
    }
    return result
  })
  for (const [key, value] of Object.entries(fonts)) {
    if (key.endsWith(' ok')) expect(value, key).toBe(true)
    else expect(value, key).toBeGreaterThanOrEqual(2)
  }
})

test('kiosk: the page never scrolls', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('attract')).toBeVisible()
  const size = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    scrollH: document.documentElement.scrollHeight,
  }))
  expect(size).toEqual({ scrollW: 1280, scrollH: 800 })
})

test('the stage scales down on a smaller screen', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 600 })
  await page.goto('/')
  const box = await page.locator('[data-stage]').boundingBox()
  expect(box?.width).toBeCloseTo(960, 0)
  expect(box?.height).toBeCloseTo(600, 0)
})

test('the APK opening (?intro=1): logo, name, five modules, then the button', async ({ page }) => {
  await page.goto('/?intro=1')
  const intro = page.getByTestId('boot-intro')
  await expect(intro).toBeVisible()
  await expect(intro).toHaveAttribute('data-ready', 'true')
  // the APK's launch screen waits for this mark (MainActivity)
  await expect(page.locator('html')).toHaveAttribute('data-boot', 'ready')
  await expect(intro).toContainText('ATÜ TECH BUILDERS SUNAR')
  // the logo's chip powers on: the ring and the traces around it
  expect(await intro.locator('svg path').count()).toBeGreaterThan(20)
  await expect(intro.getByRole('heading', { name: 'KERNEL PANIC' })).toBeVisible()
  await expect(intro.locator('li[data-on="true"]')).toHaveCount(5, { timeout: 4_000 })
  await expect(intro).toHaveCount(0, { timeout: 5_000 })
  await expect(page.getByTestId('btn-panic')).toBeVisible()
})

test('a tap skips the opening', async ({ page }) => {
  await page.goto('/?intro=1')
  await expect(page.getByTestId('boot-intro')).toHaveAttribute('data-ready', 'true')
  await page.getByTestId('boot-intro').tap()
  await expect(page.getByTestId('boot-intro')).toHaveCount(0, { timeout: 1_500 })
})

test('in the browser the game opens without the APK opening', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('attract')).toBeVisible()
  await expect(page.getByTestId('boot-intro')).toHaveCount(0)
})
