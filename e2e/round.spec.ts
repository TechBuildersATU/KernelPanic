import { expect, test } from './fixtures.ts'
import {
  expectTouchTarget,
  holdClock,
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
    await expect(live(page)).toHaveAttribute('data-stage', 'pixel')
    await expect(page.getByTestId('stage-pixel')).toHaveAttribute('data-phase', 'find')
    await expect(page.getByTestId('step-timer').first()).toHaveAttribute('data-running', 'true')
    await expect(page.getByTestId('integrity')).toHaveText('%0')
    await expectTouchTarget(page.locator('[data-odd="true"]'), 60)
  })

  test('Ölü Piksel: every screen is another kind of panel, named next to it', async ({ page }) => {
    const PANEL: Record<string, string> = {
      square: 'LCD',
      led: 'LED',
      diamond: 'elmas',
      hex: 'petek',
      bars: 'RGB',
    }
    await page.clock.install()
    await startRound(page)
    const stage = page.getByTestId('stage-pixel')
    await expect(stage).toHaveAttribute('data-phase', 'find')
    // the clock is held: on a slow machine no screen runs out while the test reads it
    await holdClock(page)
    const looks: string[] = []
    for (let i = 1; i <= 5; i++) {
      await expect(stage.getByTestId('stage-level')).toContainText(`${i}/5`)
      await expect(stage).toHaveAttribute('data-phase', 'find')
      const look = (await stage.getByTestId('pixel-grid').getAttribute('data-look')) ?? ''
      looks.push(look)
      await expect(stage.getByTestId('pixel-panel')).toHaveText(`panel ${PANEL[look]}`)
      await stage.locator('[data-odd="true"]').tap()
      await page.clock.runFor(1_500)
    }
    expect(new Set(looks).size).toBe(5)
    expect(looks.indexOf('diamond')).toBeLessThanOrEqual(2)
  })

  test('a wrong pixel costs 2 s; out of time the pixel is shown and screen 2 comes', async ({
    page,
  }) => {
    // real animation waits: the dead pixel stays ringed for 1.3 s
    await startRound(page, '/?seed=4&event=none')
    const stage = page.getByTestId('stage-pixel')
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
    await playStages(page, { pixel: { wrong: 2 } }, 1)
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
    await expect(live(page)).toHaveAttribute('data-stage', 'colours', { timeout: 10_000 })
    const stage = page.getByTestId('stage-colours')
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
    await expect(live(page)).toHaveAttribute('data-stage', 'trap', { timeout: 10_000 })
    const stage = page.getByTestId('stage-trap')
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
    await expect(live(page)).toHaveAttribute('data-stage', 'orders', { timeout: 10_000 })
    await expect(page.getByTestId('play')).toHaveAttribute('data-final', 'true')
    expect(await sounds(page)).toContain('final')
    await expectTouchTarget(page.getByTestId('btn-press'), 200)
    const reverse = page.waitForFunction(
      () =>
        document.querySelector<HTMLElement>('[data-testid="stage-orders"]')?.dataset.reverse ===
        'true',
      null,
      { polling: 'raf' },
    )
    await playStages(page, 'right', 5)
    await reverse
    await expect(page.getByTestId('caption-5')).toContainText('6/6 · TEMİZ', { timeout: 10_000 })
  })

  test('3 KEZ BAS: the ring fills a third per tap and closes green on the third', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    await startRound(page)
    await playStages(page, 'right', 4)
    const stage = page.getByTestId('stage-orders')
    const ring = page.getByTestId('command-ring')
    const fill = () => ring.evaluate((el) => getComputedStyle(el).getPropertyValue('--p').trim())
    await expect(stage).toBeVisible({ timeout: 10_000 })
    // play the commands right until 3 KEZ BAS comes up
    for (let i = 0; i < 6 && (await stage.getAttribute('data-eff')) !== 'triple'; i++) {
      await expect(stage).toHaveAttribute('data-phase', /cmd/, { timeout: 10_000 })
      if ((await stage.getAttribute('data-eff')) === 'triple') break
      await step(page, 'orders', true)
    }
    await expect(stage).toHaveAttribute('data-eff', 'triple')
    await expect.poll(fill).toBe('0')
    // On a busy machine three taps from outside can outlast the command's window, and under
    // ?fastTimers the closed ring is up for a few frames only: the page taps the button itself,
    // three times in a row, and notes every fill of the ring the moment it is drawn.
    const fills = await stage.evaluate(
      (el) =>
        new Promise<string[]>((done) => {
          const ring = el.querySelector<HTMLElement>('[data-testid="command-ring"]')!
          const button = el.querySelector('[data-testid="btn-press"]')!
          const seen: string[] = []
          const watch = new MutationObserver(() => {
            const p = ring.style.getPropertyValue('--p').trim()
            if (p !== '0' && p !== seen.at(-1)) seen.push(p)
            if (seen.length < 3) return
            watch.disconnect()
            done(seen)
          })
          watch.observe(ring, { attributes: true, attributeFilter: ['style'] })
          const init = { bubbles: true, pointerId: 1, isPrimary: true }
          let taps = 0
          const tap = () => {
            button.dispatchEvent(new PointerEvent('pointerdown', init))
            button.dispatchEvent(new PointerEvent('pointerup', init))
            if (++taps < 3) setTimeout(tap, 150)
          }
          tap()
        }),
    )
    expect(fills).toEqual([String(1 / 3), String(2 / 3), '1'])
    await expect(stage).toHaveAttribute('data-eff', /.+/)
  })

  test('the clock stands still under the title cards and turns red in the last 10 s', async ({
    page,
  }) => {
    await page.clock.install()
    await startRound(page)
    await expect(page.getByTestId('play-time')).toHaveText('01:00')
    await expect(page.getByTestId('stage-pixel')).toHaveAttribute('data-phase', 'find')
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
    await playStages(page, { pixel: 'wrong' })
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
    test(`restart from the ${screen} goes back to the eye`, async ({ page }) => {
      test.setTimeout(120_000)
      await startRound(page)
      await playStages(page, { pixel: { wrong: 1 } })
      if (screen === 'report') await page.getByTestId('btn-report').tap()
      await expectTouchTarget(page.getByTestId('btn-restart'))
      await page.getByTestId('btn-restart').tap()
      await expect(page.getByTestId('attract')).toBeVisible()
    })
  }

  test('the result returns to the button after 25 s without a touch', async ({ page }) => {
    test.setTimeout(120_000)
    await startRound(page)
    await playStages(page, { pixel: { wrong: 1 } })
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
