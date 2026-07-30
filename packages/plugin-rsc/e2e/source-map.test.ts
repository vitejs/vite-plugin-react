import { SourceMap, type SourceMapPayload } from 'node:module'
import { expect, test, type Page } from '@playwright/test'
import * as vite from 'vite'
import { useFixture } from './fixture'
import { waitForHydration } from './helper'

const isRolldownVite = 'rolldownVersion' in vite

function location(
  originalSource: string,
  originalLine: number,
  originalColumn: number,
) {
  return { originalSource, originalLine, originalColumn }
}

type OriginalLocation = ReturnType<typeof location>

function reference(
  name: string,
  rolldown: OriginalLocation,
  rollup: OriginalLocation | null = rolldown,
) {
  return { name, rolldown, rollup }
}

// TODO: Add separate CDP stack coverage for Server Action and Server Component
// errors and console replay.
// These zero-based expectations record current behavior, including approximate
// locations. Improving a mapping should update its expectation as a follow-up.
// https://github.com/vitejs/vite-plugin-react/issues/1361
const serverReferenceCases = [
  {
    route: '/named-function',
    references: [
      reference(
        'named-function',
        location('/src/features/named-function/action.ts', 2, 0),
      ),
    ],
  },
  {
    route: '/variables',
    references: [
      reference(
        'arrow-function',
        location('/src/features/variables/action.ts', 2, 0),
        location('/src/features/variables/action.ts', 2, 7),
      ),
      reference(
        'function-expression',
        location('/src/features/variables/action.ts', 4, 0),
        location('/src/features/variables/action.ts', 4, 7),
      ),
    ],
  },
  {
    route: '/defaults',
    references: [
      // Currently resolves to the end of the declaration.
      reference(
        'default-named-function',
        location('/src/features/defaults/named.ts', 4, 0),
      ),
      // Currently resolves to the end of the declaration.
      reference(
        'default-anonymous-function',
        location('/src/features/defaults/anonymous.ts', 4, 0),
      ),
      reference(
        'default-identifier',
        location('/src/features/defaults/identifier.ts', 6, 15),
      ),
    ],
  },
  {
    route: '/specifiers',
    references: [
      // Currently resolves to the end of the local declaration.
      reference(
        'local-alias',
        location('/src/features/specifiers/local-alias.ts', 4, 0),
      ),
      // Rolldown currently resolves to the module directive instead of the
      // re-export, while Rollup has no original mapping.
      reference(
        're-export',
        location('/src/features/specifiers/reexport.ts', 0, 0),
        null,
      ),
      // Rolldown currently resolves to the module directive instead of the
      // export-all, while Rollup has no original mapping.
      reference(
        'export-all',
        location('/src/features/specifiers/export-all.ts', 0, 0),
        null,
      ),
    ],
  },
  {
    route: '/inline-directive',
    // Inline source locations previously resolved to the directive function.
    // https://github.com/hi-ogawa/vite-plugins/issues/781#issuecomment-2849009525
    references: [
      // Rolldown currently resolves to the following arrow instead.
      reference(
        'inline-directive',
        location('/src/features/inline-directive/server.tsx', 10, 8),
        location('/src/features/inline-directive/server.tsx', 5, 2),
      ),
      // Rolldown currently resolves to the rendered section instead.
      reference(
        'inline-arrow',
        location('/src/features/inline-directive/server.tsx', 16, 4),
        location('/src/features/inline-directive/server.tsx', 10, 8),
      ),
      // Rolldown currently resolves to the end of the JSX element instead.
      reference(
        'inline-function-expression',
        location('/src/features/inline-directive/server.tsx', 32, 11),
        location('/src/features/inline-directive/server.tsx', 28, 12),
      ),
    ],
  },
  {
    route: '/typescript-tsx',
    references: [
      reference(
        'typescript-tsx',
        location('/src/features/typescript-tsx/action.tsx', 2, 0),
      ),
    ],
  },
  {
    route: '/multiple-exports',
    references: [
      reference(
        'first-action',
        location('/src/features/multiple-exports/action.ts', 2, 0),
      ),
      reference(
        'second-action',
        location('/src/features/multiple-exports/action.ts', 6, 0),
      ),
    ],
  },
  {
    route: '/server-reference-from-client',
    references: [
      reference(
        'server-reference-from-client',
        location('/src/features/server-reference-from-client/action.ts', 2, 0),
      ),
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
            ? location(
                original.originalSource,
                original.originalLine!,
                original.originalColumn!,
              )
            : null
        expect
          .soft(actual)
          .toEqual(isRolldownVite ? reference.rolldown : reference.rollup)
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
