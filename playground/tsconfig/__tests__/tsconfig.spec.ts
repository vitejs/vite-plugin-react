import { expect, test } from 'vitest'
import { page } from '~utils'

test('respect tsconfig jsxImportSource', async () => {
  await expect
    .poll(() =>
      page.getByTestId('emotion').evaluate((el) => getComputedStyle(el).color),
    )
    .toBe('rgb(255, 0, 0)')
})
