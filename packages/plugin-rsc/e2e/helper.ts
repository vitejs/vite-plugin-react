import fs from 'node:fs'
import path from 'node:path'
import test, { type Page, expect } from '@playwright/test'

export const testNoJs = test.extend({
  javaScriptEnabled: ({}, use) => use(false),
})

export async function waitForHydration(page: Page, locator: string = 'body') {
  await expect
    .poll(
      () =>
        page
          .locator(locator)
          .evaluate(
            (el) =>
              el &&
              Object.keys(el).some((key) => key.startsWith('__reactFiber')),
          ),
      { timeout: 20000 },
    )
    .toBeTruthy()
}

export async function expectNoReload(page: Page) {
  // inject custom meta
  await page.evaluate(() => {
    const el = document.createElement('meta')
    el.setAttribute('name', 'x-reload-check')
    document.head.append(el)
  })

  // TODO: playwright prints a weird error on dispose error,
  // so maybe we shouldn't abuse this pattern :(
  return {
    [Symbol.asyncDispose]: async () => {
      // check if meta is preserved
      await expect(page.locator(`meta[name="x-reload-check"]`)).toBeAttached({
        timeout: 1,
      })
      await page.evaluate(() => {
        document.querySelector(`meta[name="x-reload-check"]`)!.remove()
      })
    },
  }
}

export function expectNoPageError(page: Page) {
  const errors: Error[] = []
  page.on('pageerror', (error) => {
    errors.push(error)
  })
  return {
    [Symbol.dispose]: () => {
      expect(errors).toEqual([])
    },
  }
}

// The builds of React's Flight runtime in a server build's output, e.g. `server.edge`.
// Matches the CommonJS wrapper named after the file, since Rollup drops React's license comments:
// `require_react_server_dom_webpack_server_edge_production` (rolldown) or
// `requireReactServerDomWebpackServer_edge_production` (Rollup)
export function getBundledReactServerDomBuilds(outDir: string): string[] {
  const builds = new Set<string>()
  for (const file of fs.readdirSync(outDir, { recursive: true })) {
    if (!String(file).endsWith('.js')) continue
    const code = fs.readFileSync(path.join(outDir, String(file)), 'utf-8')
    for (const match of code.matchAll(
      /require_?react_?server_?dom_?webpack_?(server|client)_([a-z]+)_(?:production|development)\b/gi,
    )) {
      builds.add(`${match[1]!.toLowerCase()}.${match[2]}`)
    }
  }
  return [...builds].sort()
}

// The builds of React's Flight runtime pre-bundled by an environment's dep optimizer
export function getOptimizedReactServerDomBuilds(
  root: string,
  environmentName: string,
): string[] {
  const metadata = JSON.parse(
    fs.readFileSync(
      path.join(
        root,
        `node_modules/.vite/deps_${environmentName}/_metadata.json`,
      ),
      'utf-8',
    ),
  ) as { optimized: Record<string, unknown> }
  return Object.keys(metadata.optimized)
    .flatMap((id) => id.match(/\/react-server-dom\/(\w+\.\w+)$/)?.[1] ?? [])
    .sort()
}
