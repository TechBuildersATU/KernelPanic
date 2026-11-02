import { expect, test } from './fixtures.ts'
import {
  expectTouchTarget,
  playStages,
  REAL_URL,
  ROUND_URL,
  sounds,
  startRound,
  step,
} from './helpers.ts'

// The five stages (§2.3), their grades, the result (§5) and the error report (§6).

const live = (page: import('@playwright/test').Page) =>
  page.locator('[data-testid="stage"][data-live="true"]')

test.describe('Stages', () => {
  test('stage 1 opens with its title card, then Ölü Piksel with its own clock', async ({
    page,
  }) => {
    await startRound(page)
    await expect(page.getByTestId('mission')).toContainText('1/5')
    await expect(page.getByTestId('stage-name')).toHaveText('ÖLÜ PİKSEL')
    await expect(page.getByTestId('stage-intro')).toContainText('AŞAMA 1/5')
    await expect(page.getByTestId('stage-intro')).toContainText('BUL!')
    await expect(live(page)).toHaveAttribute('data-stage', 'piksel')
    await expect(page.getByTestId('stage-piksel')).toHaveAttribute('data-phase', 'find')
    await expect(page.getByTestId('step-timer').first()).toHaveAttribute('data-running', 'true')
    await expect(page.getByTestId('integrity')).toHaveText('%0')
    await expectTouchTarget(page.locator('[data-odd="true"]'), 60)
  })

  test('a wrong pixel costs 2 s; out of time the pixel is shown and screen 2 comes', async ({
    page,
  }) => {
    // real animation waits: the dead pixel stays ringed for 1.3 s
    await startRound(page, '/?seed=4&event=none')
    const stage = page.getByTestId('stage-piksel')
    await expect(stage).toHaveAttribute('data-phase', 'find', { timeout: 5_000 })
    await stage.locator('[data-odd="false"]').first().tap()
    await expect(page.getByTestId('penalty')).toHaveText('−2 sn')
    expect(await sounds(page)).toContain('miss')
    // 5 s screen − 2 s: about 3 s later the dead pixel is ringed
    await expect(stage).toHaveAttribute('data-phase', 'reveal', { timeout: 5_000 })
    await expect(stage.locator('[data-dead="true"]')).toHaveCount(1)
    await expect(stage.getByTestId('stage-level')).toContainText('2/5')
    await expect(stage).toHaveAttribute('data-phase', 'find')
  })

  test('stage 1 all right → green card TEMİZ, the HUD module turns green', async ({ page }) => {
    await startRound(page, REAL_URL)
    await playStages(page, 'right', 1)
    await expect(page.getByTestId('stage-end')).toBeVisible()
    await expect(page.getByTestId('stage-grade')).toHaveText('TEMİZ')
    await expect(page.getByTestId('stage-score')).toContainText('5/5 ekran doğru · %100')
    await expect(page.locator('[data-testid="play"] [data-cell="1"]')).toHaveAttribute(
      'data-state',
      'perfect',
    )
    await expect(page.getByTestId('integrity')).toHaveText('%20')
    await expect.poll(() => sounds(page)).toContain('grade')
    // then stage 2
    await expect(page.getByTestId('stage-name')).toHaveText('DÖRT RENK')
  })

  test('missed screens do not end the stage: 3/5 → orange SINIRDA', async ({ page }) => {
    test.setTimeout(60_000)
    await startRound(page, REAL_URL)
    await playStages(page, { piksel: { wrong: 2 } }, 1)
    await expect(page.getByTestId('stage-grade')).toHaveText('SINIRDA')
    await expect(page.getByTestId('stage-score')).toContainText('3/5 ekran doğru · %60')
    await expect(page.locator('[data-testid="play"] [data-cell="1"]')).toHaveAttribute(
      'data-state',
      'pass',
    )
  })

  test('Dört Renk: a wrong colour ends that layer, the next layer still comes', async ({
    page,
  }) => {
    test.setTimeout(90_000)
    await startRound(page, REAL_URL)
    await playStages(page, 'right', 1)
    await expect(live(page)).toHaveAttribute('data-stage', 'renk', { timeout: 10_000 })
    const stage = page.getByTestId('stage-renk')
    await expect(stage).toHaveAttribute('data-phase', 'input', { timeout: 10_000 })
    const rest = (await stage.locator('[data-seq]').getAttribute('data-seq'))!.split(',')
    await stage.locator(`[data-k="${(Number(rest[0]) + 1) % 4}"]`).tap()
    await expect(stage).toHaveAttribute('data-phase', 'fail')
    await expect(stage.getByTestId('stage-level')).toContainText('2/3', { timeout: 5_000 })
    await playStages(page, 'right', 2)
    // 3 colours missed out of 13 → 10/13 = %77 → lime
    await expect(page.getByTestId('stage-score')).toContainText('10/13 renk doğru · %77')
    await expect(page.getByTestId('stage-grade')).toHaveText('İYİ')
  })

  test('Renk Tuzağı: first the word, then a warning, then the ink colour', async ({ page }) => {
    test.setTimeout(90_000)
    await startRound(page)
    await playStages(page, 'right', 3)
    await expect(live(page)).toHaveAttribute('data-stage', 'tuzak', { timeout: 10_000 })
    const stage = page.getByTestId('stage-tuzak')
    await expect(stage).toContainText('YAZISINA BAS')
    for (let i = 0; i < 3; i++) {
      await expect(stage).toHaveAttribute('data-phase', 'answer')
      await stage.locator('[data-correct="true"]').tap()
    }
    await expect(page.getByTestId('rule-change')).toContainText('KURAL DEĞİŞTİ')
    await expect(stage).toHaveAttribute('data-rule', '1')
    await expect(stage).toContainText('RENGİNE BAS')
    // the ink colour is the right button now
    await expect(stage).toHaveAttribute('data-phase', 'answer')
    const ink = await page.getByTestId('trap-word').evaluate((el) => getComputedStyle(el).color)
    const right = stage.locator('[data-correct="true"]')
    expect(await right.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(ink)
  })

  test('Basma Dedik is the final: TERS MOD before the last two commands', async ({ page }) => {
    test.setTimeout(120_000)
    await startRound(page)
    await playStages(page, 'right', 4)
    await expect(live(page)).toHaveAttribute('data-stage', 'basma', { timeout: 10_000 })
    await expect(page.getByTestId('play')).toHaveAttribute('data-final', 'true')
    expect(await sounds(page)).toContain('final')
    await expectTouchTarget(page.getByTestId('btn-basma'), 200)
    const ters = page.waitForFunction(
      () =>
        document.querySelector<HTMLElement>('[data-testid="stage-basma"]')?.dataset.ters === 'true',
      null,
      { polling: 'raf' },
    )
    await playStages(page, 'right', 5)
    await ters
    await expect(page.getByTestId('caption-5')).toContainText('6/6 · TEMİZ', { timeout: 10_000 })
  })

  test('3 KEZ BAS: the ring fills a third per tap and closes green on the third', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await startRound(page)
    await playStages(page, 'right', 4)
    const stage = page.getByTestId('stage-basma')
    const ring = page.getByTestId('command-ring')
    const fill = () => ring.evaluate((el) => getComputedStyle(el).getPropertyValue('--p').trim())
    await expect(stage).toBeVisible({ timeout: 10_000 })
    // play the commands right until 3 KEZ BAS comes up
    for (let i = 0; i < 6 && (await stage.getAttribute('data-eff')) !== 'uc'; i++) {
      await expect(stage).toHaveAttribute('data-phase', /cmd/, { timeout: 10_000 })
      if ((await stage.getAttribute('data-eff')) === 'uc') break
      await step(page, 'basma', true)
    }
    await expect(stage).toHaveAttribute('data-eff', 'uc')
    const button = page.getByTestId('btn-basma')
    await button.tap()
    await expect.poll(fill).toBe(String(1 / 3))
    await button.tap()
    await expect.poll(fill).toBe(String(2 / 3))
    // under ?fastTimers the closed ring is up for a few frames: the page notes it the moment
    // the step turns 'ok'
    await stage.evaluate((el) => {
      const w = window as unknown as { __kpRing?: string }
      const watch = new MutationObserver(() => {
        if (el.dataset.phase !== 'ok') return
        const ring = el.querySelector('[data-testid="command-ring"]')!
        w.__kpRing = getComputedStyle(ring).getPropertyValue('--p').trim()
        watch.disconnect()
      })
      watch.observe(el, { attributes: true, attributeFilter: ['data-phase'] })
    })
    await button.tap()
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __kpRing?: string }).__kpRing))
      .toBe('1')
  })

  test('the clock stands still under the title cards and turns red in the last 10 s', async ({
    page,
  }) => {
    await page.clock.install()
    await startRound(page)
    await expect(page.getByTestId('play-time')).toHaveText('01:00')
    await expect(page.getByTestId('stage-piksel')).toHaveAttribute('data-phase', 'find')
    await page.clock.fastForward(51_000)
    await expect(page.getByTestId('play')).toHaveAttribute('data-low', 'true')
    // the stages ran out on their own meanwhile; the ticks come while a step's clock runs
    await expect
      .poll(async () => {
        await page.clock.runFor(500)
        return sounds(page)
      })
      .toContain('tick')
  })
})

test.describe('Result and error report', () => {
  test('all five perfect → SYSTEM SAVIOR, clean log, no report button', async ({ page }) => {
    test.setTimeout(120_000)
    await startRound(page)
    await playStages(page, 'right')
    const result = page.getByTestId('result')
    await expect(result).toHaveAttribute('data-title', 'system-savior')
    await expect(page.getByTestId('result-title')).toHaveText('SYSTEM SAVIOR')
    await expect(page.getByTestId('count-wrong')).toHaveText('0')
    for (let i = 1; i <= 5; i++)
      await expect(page.getByTestId(`caption-${i}`)).toContainText('TEMİZ')
    await expect(page.getByTestId('clean-log')).toBeVisible()
    await expect(page.getByTestId('btn-report')).toHaveCount(0)
  })

  test('four green, one red stage → ONE BUG LEFT; the report shows that stage', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await startRound(page)
    await playStages(page, { piksel: 'wrong' })
    await expect(page.getByTestId('result')).toHaveAttribute('data-title', 'one-bug-left')
    await expect(page.getByTestId('caption-1')).toContainText('0/5 · BOZUK')

    await expectTouchTarget(page.getByTestId('btn-report'))
    await page.getByTestId('btn-report').tap()
    await expect(page.getByTestId('report')).toBeVisible()
    await expect(page.locator('[data-testid^="report-row-"]')).toHaveCount(1)
    await expect(page.getByTestId('report-row-1')).toContainText('Ölü Piksel')
    await expect(page.getByTestId('report-grade-1')).toHaveText('0/5 · %0 · BOZUK')
    await expect(page.getByTestId('report-row-1')).toContainText('1. ekran · süre bitti')

    await page.getByTestId('btn-back').tap()
    await expect(page.getByTestId('result')).toBeVisible()
  })

  for (const screen of ['result', 'report'] as const) {
    test(`restart from the ${screen} goes back to the red button`, async ({ page }) => {
      test.setTimeout(120_000)
      await startRound(page)
      await playStages(page, { piksel: { wrong: 1 } })
      if (screen === 'report') await page.getByTestId('btn-report').tap()
      await expectTouchTarget(page.getByTestId('btn-restart'))
      await page.getByTestId('btn-restart').tap()
      await expect(page.getByTestId('attract')).toBeVisible()
    })
  }

  test('the result returns to the button after 25 s without a touch', async ({ page }) => {
    test.setTimeout(120_000)
    await startRound(page)
    await playStages(page, { piksel: { wrong: 1 } })
    await expect(page.getByTestId('result-title')).toBeVisible()
    await page.clock.install()
    await page.getByTestId('btn-report').tap()
    await expect(page.getByTestId('report')).toBeVisible()
    await page.clock.fastForward(20_000)
    await expect(page.getByTestId('report')).toBeVisible()
    await page.clock.fastForward(6_000)
    await expect(page.getByTestId('attract')).toBeVisible()
  })

  test('a new round after restart starts again at stage 1/5', async ({ page }) => {
    test.setTimeout(120_000)
    await startRound(page, ROUND_URL)
    await playStages(page, 'right')
    await page.getByTestId('btn-restart').tap()
    await page.getByTestId('btn-panic').tap()
    await expect(page.getByTestId('play')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('mission')).toContainText('1/5')
    await expect(page.getByTestId('integrity')).toHaveText('%0')
  })
})
