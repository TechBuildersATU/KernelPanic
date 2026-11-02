import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { playStages, ROUND_URL, startRound } from './helpers.ts'

// Background music (src/audio/music.ts): which piece plays on which screen, and how hard.

interface MusicState {
  playing: boolean
  scene: 'menu' | 'play' | 'win' | 'close' | 'crash' | 'off'
  intensity: number
  muffled: boolean
}

function music(page: Page): Promise<MusicState> {
  return page.evaluate(() => (window as unknown as { __kpMusic: MusicState }).__kpMusic)
}

test('the waiting theme plays on the button screen', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('disclaimer').tap() // any first touch unlocks audio
  await expect.poll(async () => (await music(page)).scene).toBe('menu')
  expect((await music(page)).playing).toBe(true)
})

test('silence under the hack alarm, the driving theme on the stages', async ({ page }) => {
  await page.goto('/?seed=4&event=none')
  await page.getByTestId('btn-panic').tap()
  await expect(page.getByTestId('hack')).toBeVisible()
  await expect.poll(async () => (await music(page)).scene).toBe('off')
  await expect(page.getByTestId('play')).toBeVisible({ timeout: 10_000 })
  await expect.poll(async () => (await music(page)).scene).toBe('play')
  expect((await music(page)).intensity).toBeCloseTo(0.35)
})

test('the last ten seconds push the intensity up', async ({ page }) => {
  await page.clock.install()
  await startRound(page)
  await expect.poll(async () => (await music(page)).intensity).toBeCloseTo(0.35)
  await expect(page.getByTestId('stage-pixel')).toHaveAttribute('data-phase', 'find')
  await page.clock.fastForward(51_000)
  await expect.poll(async () => (await music(page)).intensity).toBe(1)
})

test('the final stage plays harder', async ({ page }) => {
  test.setTimeout(120_000)
  await startRound(page)
  await playStages(page, 'right', 4)
  await expect(page.getByTestId('play')).toHaveAttribute('data-final', 'true', { timeout: 10_000 })
  await expect.poll(async () => (await music(page)).intensity).toBeCloseTo(0.7)
})

test('the Overheat muffles the music while the clock stands still', async ({ page }) => {
  await startRound(page, '/?seed=4&fastTimers=1&event=overheat-slow')
  await playStages(page, 'right', 1)
  await expect(page.getByTestId('timer-paused')).toBeVisible({ timeout: 5_000 })
  await expect.poll(async () => (await music(page)).muffled).toBe(true)
  await expect(page.getByTestId('mission')).toContainText('2/5', { timeout: 8_000 })
  await expect.poll(async () => (await music(page)).muffled).toBe(false)
})

test('the result plays a theme for its tone, the button its own again', async ({ page }) => {
  test.setTimeout(120_000)
  await startRound(page, ROUND_URL)
  await playStages(page, 'right')
  await expect(page.getByTestId('result-title')).toBeVisible()
  await expect.poll(async () => (await music(page)).scene).toBe('win')
  await page.getByTestId('btn-restart').tap()
  await expect.poll(async () => (await music(page)).scene).toBe('menu')
})

test('the music switch in the settings turns it off and is remembered', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('btn-settings').tap()
  await expect(page.getByTestId('btn-music')).toHaveText('Açık')
  await page.getByTestId('btn-music').tap()
  await expect(page.getByTestId('btn-music')).toHaveText('Kapalı')
  await expect.poll(async () => (await music(page)).playing).toBe(false)
  expect(await page.evaluate(() => localStorage.getItem('kernelpanic.musicOff'))).toBe('1')
})

test('a close result and a crash get their own themes', async ({ page }) => {
  test.setTimeout(180_000)
  await startRound(page, ROUND_URL)
  await playStages(page, { pixel: { wrong: 2 }, colours: { wrong: 3 } })
  await expect(page.getByTestId('result')).toHaveAttribute('data-tone', 'close')
  await expect.poll(async () => (await music(page)).scene).toBe('close')
  await page.getByTestId('btn-restart').tap()
  await startRound(page, ROUND_URL)
  await playStages(page, 'wrong')
  await expect(page.getByTestId('result')).toHaveAttribute('data-tone', 'crash')
  await expect.poll(async () => (await music(page)).scene).toBe('crash')
})
