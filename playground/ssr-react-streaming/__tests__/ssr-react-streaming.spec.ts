import { expect, test } from 'vitest'
import { editFile, isBuild, page, viteTestUrl as url } from '~utils'

test('interactive before suspense is resolved', async () => {
  await page.goto(url, { waitUntil: 'commit' }) // don't wait for full html
  await expect
    .poll(() => page.getByTestId('hydrated').textContent())
    .toContain('[hydrated: 1]')
  await expect
    .poll(() => page.getByTestId('suspense').textContent())
    .toContain('suspense-fallback')
  await expect
    .poll(() => page.getByTestId('suspense').textContent(), { timeout: 2000 })
    .toContain('suspense-resolved')
})

test.skipIf(isBuild)('hmr', async () => {
  await page.goto(url)
  await expect
    .poll(() => page.getByTestId('hydrated').textContent())
    .toContain('[hydrated: 1]')
  await page.getByTestId('counter').click()
  await expect
    .poll(() => page.getByTestId('counter').textContent())
    .toContain('Counter: 1')
  editFile('src/root.tsx', (code) => code.replace('Counter:', 'Counter-edit:'))
  await expect
    .poll(() => page.getByTestId('counter').textContent())
    .toContain('Counter-edit: 1')
})
