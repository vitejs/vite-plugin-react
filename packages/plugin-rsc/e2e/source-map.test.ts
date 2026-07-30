import { SourceMap, type SourceMapPayload } from 'node:module'
import { expect, test, type Page } from '@playwright/test'
import { useFixture } from './fixture'
import { waitForHydration } from './helper'

// TODO: Add separate CDP stack coverage for Server Action and Server Component
// errors and console replay.
// These zero-based expectations record current behavior, including approximate
// locations. Improving a mapping should update its expectation as a follow-up.
// https://github.com/vitejs/vite-plugin-react/issues/1361
const serverReferenceCases = [
  {
    route: '/named-function',
    references: [
      {
        name: 'named-function',
        originalSource: '/src/features/named-function/action.ts',
        originalLine: 2,
        originalColumn: 0,
      },
    ],
  },
  {
    route: '/variables',
    references: [
      {
        name: 'arrow-function',
        originalSource: '/src/features/variables/action.ts',
        originalLine: 2,
        originalColumn: 0,
      },
      {
        name: 'function-expression',
        originalSource: '/src/features/variables/action.ts',
        originalLine: 4,
        originalColumn: 0,
      },
    ],
  },
  {
    route: '/defaults',
    references: [
      {
        // Currently resolves to the end of the declaration.
        name: 'default-named-function',
        originalSource: '/src/features/defaults/named.ts',
        originalLine: 4,
        originalColumn: 0,
      },
      {
        // Currently resolves to the end of the declaration.
        name: 'default-anonymous-function',
        originalSource: '/src/features/defaults/anonymous.ts',
        originalLine: 4,
        originalColumn: 0,
      },
      {
        name: 'default-identifier',
        originalSource: '/src/features/defaults/identifier.ts',
        originalLine: 6,
        originalColumn: 15,
      },
    ],
  },
  {
    route: '/specifiers',
    references: [
      {
        // Currently resolves to the end of the local declaration.
        name: 'local-alias',
        originalSource: '/src/features/specifiers/local-alias.ts',
        originalLine: 4,
        originalColumn: 0,
      },
      {
        // Currently resolves to the module directive instead of the re-export.
        name: 're-export',
        originalSource: '/src/features/specifiers/reexport.ts',
        originalLine: 0,
        originalColumn: 0,
      },
      {
        // Currently resolves to the module directive instead of the export-all.
        name: 'export-all',
        originalSource: '/src/features/specifiers/export-all.ts',
        originalLine: 0,
        originalColumn: 0,
      },
    ],
  },
  {
    route: '/inline-directive',
    references: [
      {
        // Currently resolves to the following arrow instead of the function.
        name: 'inline-directive',
        originalSource: '/src/features/inline-directive/server.tsx',
        originalLine: 10,
        originalColumn: 8,
      },
      {
        // Currently resolves to the rendered section instead of the function.
        name: 'inline-arrow',
        originalSource: '/src/features/inline-directive/server.tsx',
        originalLine: 16,
        originalColumn: 4,
      },
      {
        // Currently resolves to the end of the JSX element instead of the function.
        name: 'inline-function-expression',
        originalSource: '/src/features/inline-directive/server.tsx',
        originalLine: 32,
        originalColumn: 11,
      },
    ],
  },
  {
    route: '/typescript-tsx',
    references: [
      {
        name: 'typescript-tsx',
        originalSource: '/src/features/typescript-tsx/action.tsx',
        originalLine: 2,
        originalColumn: 0,
      },
    ],
  },
  {
    route: '/multiple-exports',
    references: [
      {
        name: 'first-action',
        originalSource: '/src/features/multiple-exports/action.ts',
        originalLine: 2,
        originalColumn: 0,
      },
      {
        name: 'second-action',
        originalSource: '/src/features/multiple-exports/action.ts',
        originalLine: 6,
        originalColumn: 0,
      },
    ],
  },
  {
    route: '/server-reference-from-client',
    references: [
      {
        name: 'server-reference-from-client',
        originalSource: '/src/features/server-reference-from-client/action.ts',
        originalLine: 2,
        originalColumn: 0,
      },
    ],
  },
]

test.describe('source map', () => {
  const f = useFixture({
    root: 'examples/source-map',
    mode: 'dev',
  })

  for (const sourceMapCase of serverReferenceCases) {
    test(`maps Server References on ${sourceMapCase.route}`, async ({
      browserName,
      page,
    }) => {
      test.skip(browserName !== 'chromium')

      await using resolver = await createFunctionSourceMapResolver(
        page,
        f.url(),
      )
      await page.goto(f.url(sourceMapCase.route))
      await waitForHydration(page)

      for (const { name, ...expected } of sourceMapCase.references) {
        await expect
          .poll(() =>
            page.evaluate(
              (name) =>
                typeof (window as any).__serverReferenceSourceLocations?.[name],
              name,
            ),
          )
          .toBe('function')

        const original = await resolver.resolve(name)
        expect(original).toMatchObject(expected)
      }
    })
  }
})

async function createFunctionSourceMapResolver(page: Page, baseURL: string) {
  const session = await page.context().newCDPSession(page)
  const scripts = new Map<string, { sourceMapURL?: string }>()
  session.on('Debugger.scriptParsed', (event) => {
    scripts.set(event.scriptId, { sourceMapURL: event.sourceMapURL })
  })
  await session.send('Debugger.enable')

  return {
    async resolve(reference: string) {
      const evaluated = await session.send('Runtime.evaluate', {
        expression: `window.__serverReferenceSourceLocations[${JSON.stringify(reference)}]`,
        objectGroup: 'source-map',
      })
      expect(evaluated.exceptionDetails).toBeUndefined()
      expect(evaluated.result.type).toBe('function')
      expect(evaluated.result.objectId).toBeTruthy()

      const properties = await session.send('Runtime.getProperties', {
        objectId: evaluated.result.objectId!,
        ownProperties: true,
      })
      // V8 exposes ordinary function locations through this inspector property.
      // https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-getProperties
      // https://github.com/v8/v8/blob/main/src/inspector/value-mirror.cc
      // React creates an eval-backed client proxy at the transported server location.
      // https://github.com/react/react/pull/30741
      const functionLocation = properties.internalProperties?.find(
        (property) => property.name === '[[FunctionLocation]]',
      )?.value?.value as FunctionLocation | undefined
      expect(functionLocation).toBeTruthy()

      const script = scripts.get(functionLocation!.scriptId)
      expect(script?.sourceMapURL).toContain('/__vite_rsc_findSourceMapURL?')

      // Reproduce the source-map lookup Chrome DevTools performs for the proxy.
      const sourceMapURL = new URL(script!.sourceMapURL!, baseURL).href
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
      return sourceMap.findEntry(
        functionLocation!.lineNumber,
        functionLocation!.columnNumber,
      )
    },
    async [Symbol.asyncDispose]() {
      await session.send('Runtime.releaseObjectGroup', {
        objectGroup: 'source-map',
      })
      await session.detach()
    },
  }
}

interface FunctionLocation {
  scriptId: string
  lineNumber: number
  columnNumber: number
}
