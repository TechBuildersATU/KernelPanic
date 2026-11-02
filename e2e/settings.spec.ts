import { expect, test } from './fixtures.ts'
import { expectTouchTarget, ROUND_URL, startRound } from './helpers.ts'

// The button screen's corner controls: the settings gear, "Bizi takip edin", the "sudo" egg;
// and the house inside a round.

async function openSettings(page: import('@playwright/test').Page) {
  await page.goto(ROUND_URL)
  await page.getByTestId('btn-settings').tap()
  await expect(page.getByTestId('settings')).toBeVisible()
}

test('the gear opens the settings: round length and sound, every control big enough', async ({
  page,
}) => {
  await page.goto(ROUND_URL)
  await expectTouchTarget(page.getByTestId('btn-settings'))
  await page.getByTestId('btn-settings').tap()
  await expect(page.getByTestId('settings')).toBeVisible()
  for (const id of [
    'round-45',
    'round-60',
    'round-75',
    'btn-sound',
    'btn-vol-down',
    'btn-vol-up',
    'btn-sound-test',
    'btn-music',
    'btn-close-settings',
  ]) {
    await expectTouchTarget(page.getByTestId(id))
  }
  // nothing else lives there any more
  await expect(page.getByTestId('btn-reduce')).toHaveCount(0)
  await page.getByTestId('btn-close-settings').tap()
  await expect(page.getByTestId('attract')).toBeVisible()
})

test('holding the logo no longer opens anything', async ({ page }) => {
  await page.clock.install()
  await page.goto('/')
  const box = (await page.getByTestId('logo').boundingBox())!
  await page.mouse.move(box.x + 40, box.y + 40)
  await page.mouse.down()
  await page.clock.fastForward(3_500)
  await page.mouse.up()
  await expect(page.getByTestId('settings')).toHaveCount(0)
})

test('round length 75 s is remembered and used in the next round', async ({ page }) => {
  await openSettings(page)
  await expect(page.getByTestId('round-60')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('round-75').tap()
  await expect(page.getByTestId('round-75')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('btn-close-settings').tap()
  const message = page.waitForFunction(
    () => document.querySelector('[data-testid="hack"]')?.textContent?.includes('75 saniyen var'),
    null,
    { polling: 'raf' },
  )
  await page.getByTestId('btn-panic').tap()
  await message
  await page.reload()
  await expect(page.getByTestId('attract')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('kernelpanic.roundSeconds'))).toBe('75')
})

test('volume steps by 10 % and stops at the ends', async ({ page }) => {
  await openSettings(page)
  await expect(page.getByTestId('volume')).toHaveText('%90')
  await page.getByTestId('btn-vol-up').tap()
  await expect(page.getByTestId('volume')).toHaveText('%100')
  await expect(page.getByTestId('btn-vol-up')).toBeDisabled()
  await page.getByTestId('btn-vol-down').tap()
  await page.getByTestId('btn-vol-down').tap()
  await expect(page.getByTestId('volume')).toHaveText('%80')
  expect(await page.evaluate(() => localStorage.getItem('kernelpanic.volume'))).toBe('80')
})

test('sound off is a toggle that persists', async ({ page }) => {
  await openSettings(page)
  await page.getByTestId('btn-sound').tap()
  await expect(page.getByTestId('btn-sound')).toHaveText('Kapalı')
  await page.getByTestId('btn-close-settings').tap()
  await page.reload()
  expect(await page.evaluate(() => localStorage.getItem('kernelpanic.soundOff'))).toBe('1')
  await page.getByTestId('btn-settings').tap()
  await expect(page.getByTestId('btn-sound')).toHaveText('Kapalı')
})

test('five quick taps on the logo: "sudo" is denied', async ({ page }) => {
  await page.goto('/')
  for (let i = 0; i < 5; i++) await page.getByTestId('logo').tap()
  await expect(page.getByTestId('sudo')).toContainText('erişim reddedildi')
  await expect(page.getByTestId('settings')).toHaveCount(0)
})

test('the club signs the game: the logo in its chip, the name in the cyber font', async ({
  page,
}) => {
  await page.goto('/')
  const brand = page.getByTestId('brand')
  await expect(brand.getByLabel('ATÜ TechBuilders', { exact: true })).toContainText('TECH BUILDERS')
  await expect(brand).not.toContainText('yapımı')
  await expect(brand).not.toContainText('stant oyunu')
  const font = await brand
    .getByLabel('ATÜ TechBuilders', { exact: true })
    .evaluate((el) => getComputedStyle(el).fontFamily)
  expect(font).toContain('Orbitron')
  // the banner's frame: a ring and the traces with their vias around the logo
  await expect(brand.locator('svg circle').first()).toBeAttached()
  expect(await brand.locator('svg path').count()).toBeGreaterThan(20)
  const box = await page.getByRole('img', { name: 'ATÜ TechBuilders' }).boundingBox()
  expect(box?.width).toBeGreaterThanOrEqual(96)
})

test('"Bizi takip edin" opens the club QR; the cross or a tap outside closes it', async ({
  page,
}) => {
  await page.goto('/')
  await expectTouchTarget(page.getByTestId('btn-social'))
  await page.getByTestId('btn-social').tap()
  const qr = page.getByTestId('social-qr')
  await expect(qr).toBeVisible()
  // the picture may still be loading on a busy machine
  await expect
    .poll(() => qr.evaluate((img: HTMLImageElement) => (img.complete ? img.naturalWidth : 0)))
    .toBeGreaterThan(0)
  await expect(page.getByTestId('social-dialog')).toContainText('linktr.ee/atutechbuilders')
  await expectTouchTarget(page.getByTestId('social-close'))
  await page.getByTestId('social-close').tap()
  await expect(page.getByTestId('social-dialog')).toHaveCount(0)
  await page.getByTestId('btn-social').tap()
  await page.mouse.click(30, 400)
  await expect(page.getByTestId('social-dialog')).toHaveCount(0)
})

test('the house in a round: a tap does nothing, held for a second it goes home', async ({
  page,
}) => {
  await startRound(page)
  const home = page.getByTestId('btn-home')
  await expectTouchTarget(home)
  await home.tap()
  await page.waitForTimeout(1_300)
  await expect(page.getByTestId('play')).toBeVisible()
  await home.dispatchEvent('pointerdown')
  await expect(home).toHaveAttribute('data-holding', 'true')
  await expect(page.getByTestId('attract')).toBeVisible({ timeout: 5_000 })
})
