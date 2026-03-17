import fetch from 'node-fetch'
import { expect, test } from 'vitest'
import { page, viteTestUrl as url } from '~utils'

test('/ renders home page with navigation', async () => {
  await page.goto(url)
  await expect.poll(() => page.textContent('h1')).toMatch('Home')

  // raw http request confirms SSR
  const html = await (await fetch(url)).text()
  expect(html).toContain('<h1>Home</h1>')
  expect(html).toContain('Throws during render')
})

test('/throws-render triggers error boundary on client', async () => {
  await page.goto(url + '/throws-render')

  // The error boundary should catch the render error and display fallback UI
  await expect
    .poll(() => page.textContent('[data-testid="error-fallback"]'))
    .toContain('Something went wrong')

  // The digest should be visible in the fallback
  await expect
    .poll(() => page.textContent('[data-testid="error-fallback"]'))
    .toContain('RENDER_ERROR_001')
})

test('/throws-render SSR response includes error script fallback', async () => {
  // The raw SSR response should still be valid HTML (not a 500 error page).
  // React streams the shell, then the error boundary catches the throw.
  const res = await fetch(url + '/throws-render')
  expect(res.status).toBe(200)
  const html = await res.text()
  // Should contain the HTML shell
  expect(html).toContain('<div id="app">')
})

test('/throws-effect renders on server, throws on client', async () => {
  // Verify SSR produces valid HTML (effect does not run on server)
  const html = await (await fetch(url + '/throws-effect')).text()
  expect(html).toContain('Throws in Effect')

  // On the client, the effect triggers an error caught by ErrorBoundary
  await page.goto(url + '/throws-effect')
  await expect
    .poll(() => page.textContent('[data-testid="error-fallback"]'))
    .toContain('Something went wrong')
  await expect
    .poll(() => page.textContent('[data-testid="error-fallback"]'))
    .toContain('Intentional effect error')
})
