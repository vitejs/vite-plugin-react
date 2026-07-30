import { SourceMap, type SourceMapPayload } from 'node:module'
import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'
import { waitForHydration } from './helper'

// TODO: Automate the remaining manual cases listed in the example README.
test.describe('source map', () => {
  const f = useFixture({
    root: 'examples/source-map',
    mode: 'dev',
  })

  test('maps the React server function proxy to its source export', async ({
    browserName,
    page,
  }) => {
    test.skip(browserName !== 'chromium')

    const session = await page.context().newCDPSession(page)
    const scripts = new Map<string, { url: string; sourceMapURL?: string }>()
    session.on('Debugger.scriptParsed', (event) => {
      scripts.set(event.scriptId, {
        url: event.url,
        sourceMapURL: event.sourceMapURL,
      })
    })
    await session.send('Debugger.enable')

    await page.goto(f.url('/named-function'))
    await waitForHydration(page)
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            typeof (
              window as Window & {
                __serverReferenceSourceLocations?: Record<string, unknown>
              }
            ).__serverReferenceSourceLocations?.['named-function'],
        ),
      )
      .toBe('function')

    const evaluated = await session.send('Runtime.evaluate', {
      expression: 'window.__serverReferenceSourceLocations["named-function"]',
      objectGroup: 'source-map',
    })
    expect(evaluated.exceptionDetails).toBeUndefined()
    expect(evaluated.result.type).toBe('function')
    expect(evaluated.result.objectId).toBeTruthy()

    const properties = await session.send('Runtime.getProperties', {
      objectId: evaluated.result.objectId!,
      ownProperties: true,
    })
    // React exposes the received Server Function through an eval-backed proxy.
    const location = properties.internalProperties?.find(
      (property) => property.name === '[[FunctionLocation]]',
    )?.value?.value as
      | {
          scriptId: string
          lineNumber: number
          columnNumber: number
        }
      | undefined
    expect(location).toBeTruthy()

    const script = scripts.get(location!.scriptId)
    expect(script?.url).toMatch(/^about:\/\/React\/Server\//)
    expect(script?.sourceMapURL).toContain('/__vite_rsc_findSourceMapURL?')

    // Reproduce the source-map lookup Chrome DevTools performs for that proxy.
    const sourceMapURL = new URL(script!.sourceMapURL!, f.url()).href
    const response = await page.request.get(sourceMapURL)
    expect(response.ok()).toBe(true)
    const payload = (await response.json()) as Partial<SourceMapPayload>
    const sourceMap = new SourceMap({
      file: payload.file ?? '',
      version: payload.version!,
      sources: payload.sources!,
      sourcesContent: payload.sourcesContent ?? [],
      names: payload.names ?? [],
      mappings: payload.mappings!,
      sourceRoot: payload.sourceRoot ?? '',
    })
    const original = sourceMap.findEntry(
      location!.lineNumber,
      location!.columnNumber,
    )

    expect(original).toMatchObject({
      originalSource: '/src/features/named-function/action.ts',
      originalLine: 2,
      originalColumn: 0,
    })

    await session.send('Runtime.releaseObjectGroup', {
      objectGroup: 'source-map',
    })
  })
})
