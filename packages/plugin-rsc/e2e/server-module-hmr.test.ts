import { expect, test } from '@playwright/test'
import { useFixture } from './fixture'
import { expectNoReload, waitForHydration } from './helper'

const f = useFixture({ root: 'examples/server-module-hmr', mode: 'dev' })

test('refreshes a glob-loaded server module behind a client boundary', async ({
  page,
}) => {
  await page.goto(f.url())
  await waitForHydration(page)
  await using _ = await expectNoReload(page)

  const component = page.getByTestId('workflow-component')
  await expect(component).toHaveText('Workflow component: before')

  const editor = f.createEditor('app/workflow-components/demo/component.tsx')
  await editor.edit((contents) => contents.replace('before', 'after'))

  await expect(component).toHaveText('Workflow component: after')
})
