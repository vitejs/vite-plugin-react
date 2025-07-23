import test, { type Page, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

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
      { timeout: 3000 },
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

export async function loadRSCManifest(root: string) {
  // Use dynamic "data:" import instead of URL path imports so it is
  // not cached by the runtime.
  const manifestFileContent = readFileSync(
    root + '/dist/ssr/__vite_rsc_assets_manifest.js',
    'utf-8',
  )
  const manifest = (await import('data:text/javascript,' + manifestFileContent))
    .default

  return manifest
}
