import { expect, test } from '@playwright/test'
import { x } from 'tinyexec'
import { setupInlineFixture } from './fixture'

test.describe('sourcemap', () => {
  const root = 'examples/e2e/temp/sourcemap'

  test.beforeAll(async () => {
    await setupInlineFixture({
      src: 'examples/starter',
      dest: root,
    })
  })

  test('build without broken sourcemap warnings', async () => {
    const result = await x('pnpm', ['build', '--sourcemap'], {
      nodeOptions: { cwd: root },
    })

    expect(result.exitCode).toBe(0)
    expect(result.stdout + result.stderr).not.toContain(
      'Sourcemap is likely to be incorrect',
    )
  })
})
