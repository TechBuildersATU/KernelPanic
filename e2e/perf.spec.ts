import { expect, test } from './fixtures.ts'

// The booth tablet's frame budget: the background that moves on every screen must not repaint on
// every frame (fx/World, fx/CodeRain), and a slow device steps down to a light mode (app/perf.ts).

test.use({ deviceScaleFactor: 2 })

const grid = '[data-testid="world"] [class*="_grid_"]'

test('the floor drifts by a transform; the code rain is drawn at the stage size', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByTestId('btn-panic')).toBeVisible()
  const floor = await page.locator(grid).evaluate((el) => ({
    own: getComputedStyle(el).animationName,
    inner: getComputedStyle(el, '::before').animationName,
  }))
  // the big tilted layer itself never animates; its inner tiles move
  expect(floor.own).toBe('none')
  expect(floor.inner).toContain('grid-drift')
  // a pixel ratio of 2 does not double the canvas the GPU gets on every frame
  const canvas = await page
    .locator('canvas.code-rain')
    .evaluate((el: HTMLCanvasElement) => [el.width, el.height])
  expect(canvas).toEqual([1280, 800])
  await expect(page.locator('html')).not.toHaveAttribute('data-perf', 'low')
})

test('a slow device gets the light mode: the floor holds still, the title glitch rests', async ({
  page,
}) => {
  await page.goto('/?perf=low')
  await expect(page.locator('html')).toHaveAttribute('data-perf', 'low')
  await expect(page.getByTestId('btn-panic')).toBeVisible()
  const floor = await page
    .locator(grid)
    .evaluate((el) => getComputedStyle(el, '::before').animationName)
  expect(floor).toBe('none')
  const glitch = await page
    .locator('.glitch')
    .first()
    .evaluate((el) => getComputedStyle(el, '::before').display)
  expect(glitch).toBe('none')
  // the game is the same: the eye still looks around and starts a round
  await page.getByTestId('btn-panic').tap()
  await expect(page.getByTestId('hack')).toBeVisible()
})
