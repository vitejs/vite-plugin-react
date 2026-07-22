import { type CDPSession, expect, test } from '@playwright/test'
import { useFixture } from './fixture'

test.describe('performance-track', () => {
  // Server Components performance tracks are flaky and require a Chromium trace
  // plus a React build that emits them (canary/experimental), so this is opt-in
  // via `TEST_PERFORMANCE_TRACK=1` for local runs and is not exercised in CI.
  test.skip(!process.env.TEST_PERFORMANCE_TRACK)

  const f = useFixture({ root: 'examples/performance-track', mode: 'dev' })

  test('emits server component performance tracks', async ({
    browserName,
    page,
  }) => {
    test.skip(browserName !== 'chromium')

    const session = await page.context().newCDPSession(page)
    await startTracing(session)

    await page.goto(f.url())
    await expect(
      page.getByText('SlowServerComponent resolved after 1000ms'),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Load RSC probe' }).click()
    await expect(page.getByText('Probe request: on-demand')).toBeVisible()
    await expect(
      page.getByText('SlowServerComponent resolved after 1000ms'),
    ).toBeVisible()
    await page.waitForTimeout(1000)

    const spans = await stopTracingAndCollectServerComponentSpans(session)
    const slowSpans = spans.filter(
      (span) => span.name === 'SlowServerComponent',
    )
    const dynamicImportSpans = spans.filter(
      (span) => span.name === 'DynamicImportComponent',
    )
    expect(slowSpans).toHaveLength(2)
    expect(dynamicImportSpans).toHaveLength(2)
    expect(slowSpans.every((span) => span.duration >= 900)).toBe(true)
  })
})

//
// CDP tracing helpers
//

// We drive the CDP `Tracing` domain (Tracing.start / tracingComplete stream,
// read via IO): https://chromedevtools.github.io/devtools-protocol/tot/Tracing/
// CDP leaves the individual event opaque (`dataCollected.value: object[]`), so
// this minimal shape follows Chrome's Trace Event Format instead:
// https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU
interface TraceEvent {
  name: string
  ph: string
  ts: number
  id?: string
  id2?: { local?: string }
  args?: unknown
}

// A named Server Components track entry with its measured duration (ms),
// derived from paired begin/end trace events.
interface ServerComponentSpan {
  name: string
  duration: number
}

async function startTracing(session: CDPSession): Promise<void> {
  await session.send('Tracing.start', {
    categories: '-*,devtools.timeline,blink.user_timing',
    transferMode: 'ReturnAsStream',
  })
}

async function stopTracingAndCollectServerComponentSpans(
  session: CDPSession,
): Promise<ServerComponentSpan[]> {
  const events = await stopTracing(session)
  const ends = new Map(
    events
      .filter((event) => event.ph === 'e')
      .map((event) => [traceId(event), event]),
  )
  return events
    .filter(
      (event) =>
        event.ph === 'b' &&
        JSON.stringify(event.args).includes('Server Components'),
    )
    .map((event) => ({
      name: event.name.replaceAll('\u200b', ''),
      duration: ((ends.get(traceId(event))?.ts ?? event.ts) - event.ts) / 1000,
    }))
}

async function stopTracing(session: CDPSession): Promise<TraceEvent[]> {
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
  return (JSON.parse(trace) as { traceEvents: TraceEvent[] }).traceEvents
}

function traceId(event: TraceEvent): string | undefined {
  return event.id2?.local ?? event.id
}
