import { SourceMap, type SourceMapPayload } from 'node:module'
import { expect, test, type Page } from '@playwright/test'
import * as vite from 'vite'
import { useFixture } from './fixture'
import { waitForHydration } from './helper'

const isRolldownVite = 'rolldownVersion' in vite

type ReferenceCase = {
  name: string
  rolldown: string
  rollup?: string | null
  result?: string
}

// TODO: Add separate CDP stack coverage for Server Action and Server Component
// errors and console replay.
// These zero-based expectations record current behavior, including approximate
// locations. Improving a mapping should update its expectation as a follow-up.
// https://github.com/vitejs/vite-plugin-react/issues/1361
const serverReferenceCases: {
  route: string
  references: ReferenceCase[]
}[] = [
  {
    route: '/named-function',
    references: [
      {
        name: 'named-function',
        rolldown: '/src/features/named-function/action.ts:2:0',
      },
    ],
  },
  {
    route: '/variables',
    references: [
      {
        name: 'arrow-function',
        rolldown: '/src/features/variables/action.ts:2:0',
        rollup: '/src/features/variables/action.ts:2:7',
      },
      {
        name: 'function-expression',
        rolldown: '/src/features/variables/action.ts:4:0',
        rollup: '/src/features/variables/action.ts:4:7',
      },
    ],
  },
  {
    route: '/defaults',
    references: [
      {
        name: 'default-named-function',
        rolldown: '/src/features/defaults/named.ts:2:0',
      },
      {
        name: 'default-anonymous-function',
        rolldown: '/src/features/defaults/anonymous.ts:2:0',
      },
      {
        name: 'default-identifier',
        rolldown: '/src/features/defaults/identifier.ts:6:0',
      },
    ],
  },
  {
    route: '/specifiers',
    // Registration effects for export specifiers are appended without explicit
    // mappings. These expectations record bundler-specific adjacent fallbacks.
    references: [
      {
        name: 'local-alias',
        rolldown: '/src/features/specifiers/local-alias.ts:4:0',
      },
      {
        name: 're-export',
        rolldown: '/src/features/specifiers/reexport.ts:0:0',
        rollup: '/src/features/specifiers/reexport.ts:2:0',
        result: 're-export called',
      },
      {
        name: 'export-all',
        rolldown: '/src/features/specifiers/export-all.ts:0:0',
        rollup: '/src/features/specifiers/export-all.ts:2:0',
      },
    ],
  },
  {
    route: '/inline-directive',
    // Inline source locations previously resolved to the directive function.
    // https://github.com/hi-ogawa/vite-plugins/issues/781#issuecomment-2849009525
    references: [
      {
        // Rolldown currently resolves to the following arrow instead.
        name: 'inline-directive',
        rolldown: '/src/features/inline-directive/server.tsx:10:8',
        rollup: '/src/features/inline-directive/server.tsx:5:2',
      },
      {
        // Rolldown currently resolves to the rendered section instead.
        name: 'inline-arrow',
        rolldown: '/src/features/inline-directive/server.tsx:16:4',
        rollup: '/src/features/inline-directive/server.tsx:10:8',
      },
      {
        // Rolldown currently resolves to the end of the JSX element instead.
        name: 'inline-function-expression',
        rolldown: '/src/features/inline-directive/server.tsx:32:11',
        rollup: '/src/features/inline-directive/server.tsx:28:12',
      },
    ],
  },
  {
    route: '/typescript-tsx',
    references: [
      {
        name: 'typescript-tsx',
        rolldown: '/src/features/typescript-tsx/action.tsx:2:0',
      },
    ],
  },
  {
    route: '/multiple-exports',
    references: [
      {
        name: 'first-action',
        rolldown: '/src/features/multiple-exports/action.ts:2:0',
      },
      {
        name: 'second-action',
        rolldown: '/src/features/multiple-exports/action.ts:6:0',
      },
    ],
  },
  {
    route: '/server-reference-from-client',
    references: [
      {
        name: 'server-reference-from-client',
        rolldown: '/src/features/server-reference-from-client/action.ts:2:0',
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

      for (const reference of sourceMapCase.references) {
        await expect
          .poll(() =>
            page.evaluate(
              (name) =>
                typeof (window as any).__serverReferenceSourceLocations?.[name],
              reference.name,
            ),
          )
          .toBe('function')

        const original = await resolver.resolve(reference.name)
        const actual =
          'originalSource' in original && original.originalSource
            ? `${original.originalSource}:${original.originalLine}:${original.originalColumn}`
            : null
        const expected = isRolldownVite
          ? reference.rolldown
          : reference.rollup === undefined
            ? reference.rolldown
            : reference.rollup
        expect.soft(actual).toBe(expected)

        if (reference.result) {
          const button = page.getByRole('button', {
            name: new RegExp(`^${reference.name}:`),
          })
          await button.click()
          await expect(button).toContainText(reference.result)
        }
      }
    })
  }

  test('preserves Server Function names in stack traces', async ({ page }) => {
    await page.goto(f.url('/server-function-name'))
    await waitForHydration(page)

    const cases = [
      {
        referenceName: 'module-function-name',
        functionName: 'moduleFunctionName',
      },
      {
        referenceName: 'inline-function-name',
        functionName: 'inlineFunctionName',
      },
    ]

    for (const item of cases) {
      const button = page.getByRole('button', {
        name: new RegExp(`^${item.referenceName}:`),
      })
      await button.click()
      await expect(button).toContainText(`at ${item.functionName} (`)
    }
  })
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
