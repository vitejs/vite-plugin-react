import { expect, test } from 'vitest'
import { page } from '~utils'

test('should work', async () => {
  await expect.poll(() => page.textContent('h1')).toMatch('Hello Vite + React')
})
