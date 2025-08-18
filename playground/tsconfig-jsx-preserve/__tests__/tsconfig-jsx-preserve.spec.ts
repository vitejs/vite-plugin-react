import { expect, test } from 'vitest'
import { page } from '~utils'

test('override tsconfig jsx preserve', async () => {
  await expect.poll(() => page.textContent('#app')).toBe('ok')
})
