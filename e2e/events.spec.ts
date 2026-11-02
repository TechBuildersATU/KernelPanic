import { expect, test } from './fixtures.ts'
import { playStages, sounds, startRound } from './helpers.ts'
import type { Page } from '@playwright/test'

// The surprise events (§3) and the result transitions (§5.3).

const url = (event: string) => `/?seed=4&fastTimers=1&event=${event}`
/** Real animation waits: the cards and the cooling's outcome stay up long enough to read. */
const real = (event: string) => `/?seed=4&event=${event}`

/** Seconds on the round clock (mm:ss; "+mm:ss" once it ran out). */
async function clock(page: Page): Promise<number> {
  const text = (await page.getByTestId('play-time').textContent()) ?? ''
  const [m, s] = text.replace('+', '').split(':').map(Number)
  return (text.startsWith('+') ? -1 : 1) * (m * 60 + s)
}

test.describe('SYSTEM OVERHEAT', () => {
  test('slow: alarm → "DOKUNMA!" 3 s held → +5 s, the clock standing still meanwhile', async ({
    page,
  }) => {
    await startRound(page, real('overheat-slow'))
    await playStages(page, 'right', 1)
    await expect(page.getByTestId('overheat')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId('overheat-lead')).toContainText('+5 sn kazan')
    await expect(page.getByTestId('timer-paused')).toBeVisible()
    const before = await clock(page)
    await expect(page.getByTestId('cooling')).toBeVisible()
    await expect(page.getByTestId('cooling-text')).toContainText('dokunma')
    await page.waitForTimeout(1500)
    expect(await clock(page)).toBe(before)
    await expect(page.getByTestId('cooling')).toHaveAttribute('data-result', 'ok', {
      timeout: 4_000,
    })
    await expect(page.getByTestId('cooling-text')).toHaveText('SOĞUTULDU · +5 SN')
    await expect(page.getByTestId('time-shift')).toHaveText('+5 sn')
    expect(await clock(page)).toBe(before + 5)
    await expect(page.getByTestId('mission')).toContainText('2/5')
    expect(await sounds(page)).toEqual(expect.arrayContaining(['overheat', 'bonus']))
  })

  test('slow: a touch only loses the bonus, the clock is not cut', async ({ page }) => {
    await startRound(page, real('overheat-slow'))
    await playStages(page, 'right', 1)
    await expect(page.getByTestId('cooling')).toBeVisible({ timeout: 8_000 })
    const before = await clock(page)
    await page.getByTestId('cooling').tap()
    await expect(page.getByTestId('cooling')).toHaveAttribute('data-result', 'fail')
    await expect(page.getByTestId('cooling-text')).toHaveText('SOĞUTULAMADI · süre kesilmedi')
    await expect(page.getByTestId('mission')).toContainText('2/5')
    expect(await clock(page)).toBe(before)
  })

  test('fast: held still → no bonus; a touch → "SİSTEM ISINDI" and −5 s', async ({ page }) => {
    // real waits: the outcome stays up for a second
    await startRound(page, real('overheat-fast'))
    await playStages(page, 'right', 1)
    await expect(page.getByTestId('overheat-lead')).toContainText('Dokunursan −5 sn', {
      timeout: 8_000,
    })
    await expect(page.getByTestId('cooling')).toBeVisible({ timeout: 8_000 })
    const before = await clock(page)
    await page.getByTestId('cooling').tap()
    await expect(page.getByTestId('cooling')).toHaveAttribute('data-result', 'fail')
    await expect(page.getByTestId('cooling-text')).toHaveText('SİSTEM ISINDI · −5 SN')
    await expect(page.getByTestId('time-shift')).toHaveText('−5 sn')
    expect(await clock(page)).toBe(before - 5)
    await expect(page.getByTestId('mission')).toContainText('2/5')
  })

  test('fast: held still the whole 3 s → the round goes on, no time added', async ({ page }) => {
    await startRound(page, real('overheat-fast'))
    await playStages(page, 'right', 1)
    await expect(page.getByTestId('cooling')).toBeVisible({ timeout: 8_000 })
    const before = await clock(page)
    await expect(page.getByTestId('cooling-text')).toHaveText('SOĞUTULDU · devam', {
      timeout: 5_000,
    })
    await expect(page.getByTestId('mission')).toContainText('2/5')
    expect(await clock(page)).toBe(before)
    await expect(page.getByTestId('time-shift')).toHaveCount(0)
  })

  test('the result shows the Overheat badge', async ({ page }) => {
    test.setTimeout(120_000)
    await startRound(page, url('overheat-slow'))
    await playStages(page, 'right')
    await expect(page.getByTestId('badge-overheat')).toBeVisible()
    await expect(page.getByTestId('result-title')).toBeVisible()
  })
})

test.describe('EMERGENCY MODE', () => {
  test('two big channels appear before stage 2, the clock standing still', async ({ page }) => {
    await startRound(page, url('emergency'))
    await playStages(page, 'right', 1)
    await expect(page.getByTestId('emergency')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByTestId('btn-safe')).toContainText('kolay sürümü')
    await expect(page.getByTestId('btn-risky')).toContainText('Yeşil geçersen +5 sn')
    // the screen froze: the clock stands still and the choice is read first
    await expect(page.getByTestId('emergency-frozen')).toHaveText('SÜRE DURDU')
    await expect(page.getByTestId('emergency')).toHaveAttribute('data-reading', 'true')
    await expect(page.getByTestId('emergency-hint')).toContainText('önce iki kanalı da oku')
    await expect(page.getByTestId('world')).toHaveAttribute('data-light', 'emergency')
    const before = await clock(page)
    await page.waitForTimeout(1500)
    expect(await clock(page)).toBe(before)
  })

  test('risky channel: the hardest Dört Renk (5–6–7), green → +5 s', async ({ page }) => {
    test.setTimeout(90_000)
    await startRound(page, real('emergency'))
    await playStages(page, 'right', 1)
    await page.getByTestId('btn-risky').tap()
    await expect(page.getByTestId('stage-intro')).toContainText('RİSKLİ KANAL')
    await playStages(page, 'right', 2)
    await expect(page.getByTestId('stage-score')).toContainText('18/18 renk')
    await expect(page.getByTestId('time-shift')).toHaveText('+5 sn')
  })

  test('risky channel: not green → −3 s', async ({ page }) => {
    test.setTimeout(90_000)
    await startRound(page, url('emergency'))
    await playStages(page, 'right', 1)
    await page.getByTestId('btn-risky').tap()
    await playStages(page, { renk: 'wrong' }, 2)
    await expect(page.locator('[data-testid="play"] [data-cell="2"]')).toHaveAttribute(
      'data-state',
      'fail',
    )
    await expect(page.getByTestId('time-shift')).toHaveText('−3 sn')
  })

  test('safe channel: the easy version (3–4–4), no time change', async ({ page }) => {
    test.setTimeout(90_000)
    await startRound(page, real('emergency'))
    await playStages(page, 'right', 1)
    await page.getByTestId('btn-safe').tap()
    await expect(page.getByTestId('stage-intro')).toContainText('GÜVENLİ KANAL')
    await playStages(page, 'right', 2)
    await expect(page.getByTestId('stage-score')).toContainText('11/11 renk')
    await expect(page.getByTestId('time-shift')).toHaveCount(0)
  })

  test('4 s to read, then 8 s to choose; no choice → the safe channel', async ({ page }) => {
    test.setTimeout(60_000)
    await page.clock.install()
    await startRound(page, url('emergency'))
    await playStages(page, 'right', 1)
    const panel = page.getByTestId('emergency')
    await expect(panel).toBeVisible({ timeout: 5_000 })
    await expect(panel).toHaveAttribute('data-reading', 'true')
    await page.clock.fastForward(4_500)
    // the countdown has started and says how long is left
    await expect(panel).toHaveAttribute('data-reading', 'false')
    await expect(page.getByTestId('emergency-hint')).toContainText('sn sonra sistem güvenli')
    await expect(page.getByTestId('emergency-limit')).toHaveAttribute(
      'aria-label',
      /Seçim için [5-8] saniye/,
    )
    await page.clock.fastForward(6_000)
    await expect(panel).toBeVisible()
    await page.clock.fastForward(3_000)
    await expect(panel).toHaveCount(0, { timeout: 5_000 })
    await expect(page.getByTestId('stage-intro')).toContainText('GÜVENLİ KANAL')
  })
})

test.describe('GLITCH DETECTED', () => {
  test('stage 2 is glitched: banner, and its pads trade places in layer 2 too', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await startRound(page, real('glitch'))
    await playStages(page, 'right', 1)
    await expect(page.getByTestId('stage-intro')).toContainText('GLITCH')
    await expect(page.getByTestId('banner-glitch')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByTestId('play')).toHaveAttribute('data-glitch', 'true')
    const stage = page.getByTestId('stage-renk')
    const board = stage.locator('[data-seq]')
    const placeOfPad0 = () => stage.locator('[data-k="0"]').boundingBox()
    // layer 1: the pads stay where they were
    await expect(board).toHaveCount(1, { timeout: 10_000 })
    const before = await placeOfPad0()
    for (let i = 0; i < 3; i++) {
      await expect(board).toHaveCount(1)
      await stage
        .locator(`[data-k="${(await board.getAttribute('data-seq'))!.split(',')[0]}"]`)
        .tap()
    }
    // layer 2 (glitched): after the show every pad has moved
    await expect(stage.getByTestId('stage-level')).toContainText('2/3')
    await expect(stage).toHaveAttribute('data-phase', 'swap', { timeout: 10_000 })
    await expect(board).toHaveCount(1, { timeout: 5_000 })
    await page.waitForTimeout(700)
    expect(await placeOfPad0()).not.toEqual(before)
  })
})

test.describe('POWER RESTORED', () => {
  test('animation only: banner after a green stage, clock untouched', async ({ page }) => {
    await startRound(page, url('power'))
    await playStages(page, 'right', 1)
    await expect(page.getByTestId('banner-power')).toBeVisible()
    await expect(page.getByTestId('play')).toHaveAttribute('data-mood', 'calm')
    expect(await sounds(page)).toContain('power')
    await expect(page.getByTestId('time-shift')).toHaveCount(0)
  })
})

test.describe('Result transitions (§5.3)', () => {
  test('a tap skips the transition', async ({ page }) => {
    test.setTimeout(150_000)
    await startRound(page, real('none'))
    await playStages(page, 'right')
    await page.getByTestId('result-transition').tap()
    await expect(page.getByTestId('result-title')).toBeVisible({ timeout: 1_000 })
  })

  test('coming back from the report does not replay the transition', async ({ page }) => {
    test.setTimeout(120_000)
    await startRound(page)
    await playStages(page, { piksel: { wrong: 1 } })
    await expect(page.getByTestId('result-title')).toBeVisible()
    await page.getByTestId('btn-report').tap()
    await page.getByTestId('btn-back').tap()
    await expect(page.getByTestId('result-title')).toBeVisible()
    await expect(page.getByTestId('result-transition')).toHaveCount(0)
  })

  for (const title of [
    'system-savior',
    'last-second-hero',
    'all-systems-go',
    'one-bug-left',
    'barely-booted',
    'safe-mode',
    'error-404',
    'kernel-panic',
    'almost-a-legend',
    'turn-it-off-and-on',
  ]) {
    test(`preview: ${title} plays over every event background`, async ({ page }) => {
      for (const mood of ['normal', 'overheat', 'glitch', 'emergency', 'power']) {
        await page.goto(`/?transition=${title}&mood=${mood}`)
        const transition = page.getByTestId('result-transition')
        await expect(transition).toHaveAttribute('data-title', title)
        await expect(transition).toHaveAttribute('data-mood', mood)
      }
    })
  }
})

test.describe('Natural rounds (random events on)', () => {
  for (const seed of [1, 2, 3, 5]) {
    test(`seed ${seed}: the round reaches the result through its events`, async ({ page }) => {
      test.setTimeout(150_000)
      await startRound(page, `/?seed=${seed}&fastTimers=1`)
      await playStages(page, { piksel: { wrong: 1 }, tuzak: { wrong: 2 } })
      await expect(page.getByTestId('result-title')).toBeVisible()
      // at least one random event per round (§3)
      await expect(page.locator('[data-testid^="badge-"]').first()).toBeVisible()
    })
  }
})
