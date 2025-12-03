import { expect, test, type Page } from '@playwright/test'
import { useFixture } from './fixture'
import { defineStarterTest } from './starter'

// Webkit fails by
// > TypeError: ReadableByteStreamController is not implemented
test.skip(({ browserName }) => browserName === 'webkit')

test.describe('dev-browser-mode', () => {
  const f = useFixture({ root: 'examples/browser-mode', mode: 'dev' })
  defineStarterTest(f, 'browser-mode')
  defineBrowserModeTest(f)
})

test.describe('build-browser-mode', () => {
  const f = useFixture({ root: 'examples/browser-mode', mode: 'build' })
  defineStarterTest(f, 'browser-mode')
  defineBrowserModeTest(f)
})

function defineBrowserModeTest(f: ReturnType<typeof useFixture>) {
  // action-bind tests copied from basic.test.ts

  test('action bind simple', async ({ page }) => {
    await page.goto(f.url())
    await testActionBindSimple(page)
  })

  async function testActionBindSimple(page: Page) {
    await expect(page.getByTestId('test-server-action-bind-simple')).toHaveText(
      '[?]',
    )
    await page
      .getByRole('button', { name: 'test-server-action-bind-simple' })
      .click()
    await expect(page.getByTestId('test-server-action-bind-simple')).toHaveText(
      'true',
    )
    await page
      .getByRole('button', { name: 'test-server-action-bind-reset' })
      .click()
  }

  // TODO: skipped since 19.2.1
  test.skip('action bind client', async ({ page }) => {
    await page.goto(f.url())
    await testActionBindClient(page)
  })

  async function testActionBindClient(page: Page) {
    await expect(page.getByTestId('test-server-action-bind-client')).toHaveText(
      '[?]',
    )
    await page
      .getByRole('button', { name: 'test-server-action-bind-client' })
      .click()
    await expect(page.getByTestId('test-server-action-bind-client')).toHaveText(
      'true',
    )
    await page
      .getByRole('button', { name: 'test-server-action-bind-reset' })
      .click()
  }

  test('action bind action', async ({ page }) => {
    await page.goto(f.url())
    await testActionBindAction(page)
  })

  async function testActionBindAction(page: Page) {
    await expect(page.getByTestId('test-server-action-bind-action')).toHaveText(
      '[?]',
    )
    await page
      .getByRole('button', { name: 'test-server-action-bind-action' })
      .click()
    await expect(page.getByTestId('test-server-action-bind-action')).toHaveText(
      '[true,true]',
    )
    await page
      .getByRole('button', { name: 'test-server-action-bind-reset' })
      .click()
  }
}
