import { expect, test } from '@playwright/test'
import React from 'react'
import { useFixture } from './fixture'

for (const mode of ['dev', 'build'] as const) {
  test.describe(`${mode}-performance-track`, () => {
    const f = useFixture({ root: 'examples/performance-track', mode })

    test('loads initial and on-demand RSC probes', async ({ page }) => {
      await page.goto(f.url())

      await expect(
        page.getByText('DynamicImportComponent resolved'),
      ).toBeVisible()
      await expect(
        page.getByText('SlowServerComponent resolved after 1000ms'),
      ).toBeVisible()

      await page.getByRole('button', { name: 'Load RSC probe' }).click()
      await expect(
        page.getByText('DynamicImportComponent resolved'),
      ).toHaveCount(2)
      await expect(
        page.getByText('SlowServerComponent resolved after 1000ms'),
      ).toHaveCount(2)
    })

    test('emits server component performance tracks', async ({
      browserName,
      page,
    }) => {
      test.skip(
        f.mode !== 'dev' ||
          browserName !== 'chromium' ||
          !/canary|experimental/.test(React.version),
        'Performance tracks require development mode and newer React',
      )

      const session = await page.context().newCDPSession(page)
      await session.send('Tracing.start', {
        categories: '-*,devtools.timeline,blink.user_timing',
        transferMode: 'ReturnAsStream',
      })

      await page.goto(f.url())
      await expect(
        page.getByText('SlowServerComponent resolved after 1000ms'),
      ).toBeVisible()
      await page.getByRole('button', { name: 'Load RSC probe' }).click()
      await expect(
        page.getByText('SlowServerComponent resolved after 1000ms'),
      ).toHaveCount(2)
      await page.waitForTimeout(1000)

      const tracingComplete = new Promise<string>((resolve, reject) => {
        session.once('Tracing.tracingComplete', ({ stream }) => {
          if (stream) resolve(stream)
          else reject(new Error('Trace stream is missing'))
        })
      })
      await session.send('Tracing.end')
      const stream = await tracingComplete
      let trace = ''
      for (;;) {
        const chunk = await session.send('IO.read', { handle: stream })
        trace += chunk.data
        if (chunk.eof) break
      }
      await session.send('IO.close', { handle: stream })

      const events = (JSON.parse(trace) as { traceEvents: TraceEvent[] })
        .traceEvents
      const ends = new Map(
        events
          .filter((event) => event.ph === 'e')
          .map((event) => [traceId(event), event]),
      )
      const spans = events
        .filter(
          (event) =>
            event.ph === 'b' &&
            JSON.stringify(event.args).includes('Server Components'),
        )
        .map((event) => ({
          name: event.name.replaceAll('\u200b', ''),
          duration:
            ((ends.get(traceId(event))?.ts ?? event.ts) - event.ts) / 1000,
        }))

      const slowSpans = spans.filter(
        (span) => span.name === 'SlowServerComponent',
      )
      const dynamicImportSpans = spans.filter(
        (span) => span.name === 'DynamicImportComponent',
      )
      test.skip(
        slowSpans.length !== 2 || dynamicImportSpans.length !== 2,
        'React did not flush the flaky development performance entries',
      )
      expect(slowSpans.every((span) => span.duration >= 900)).toBe(true)
    })
  })
}

interface TraceEvent {
  name: string
  ph: string
  ts: number
  id?: string
  id2?: { local?: string }
  args?: unknown
}

function traceId(event: TraceEvent): string | undefined {
  return event.id2?.local ?? event.id
}
