import { expect, test } from './fixtures.ts'

// The booth tablet may have no internet: after the first visit the app must launch offline.
// Runs against the production build so the service worker is active.

test('launches offline after the first visit', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload() // now controlled by the service worker
  await expect(page.getByTestId('attract')).toBeVisible()

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByTestId('attract')).toBeVisible()

  // the first stage works offline too (production timings, no test flags: any pixel will do)
  await page.getByTestId('btn-panic').tap()
  await expect(page.getByTestId('play')).toBeVisible({ timeout: 10_000 })
  const stage = page.getByTestId('stage-piksel')
  await expect(stage).toHaveAttribute('data-phase', 'find', { timeout: 10_000 })
  await stage.getByRole('button', { name: 'piksel' }).first().tap()
  await expect(
    page.getByTestId('penalty').or(page.locator('[data-testid="stage-piksel"][data-phase="hit"]')),
  ).toBeVisible()
})

test('fonts and logo are served locally', async ({ page }) => {
  const external: string[] = []
  page.on('request', (req) => {
    if (!req.url().startsWith('http://localhost')) external.push(req.url())
  })
  await page.goto('/')
  await expect(page.getByTestId('attract')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  expect(external).toEqual([])
})
