import { expect, test } from 'vitest'
import { editFile, getColor, isServe, page } from '~utils'

test('should render', async () => {
  expect(await page.textContent('h1')).toMatch('Hello Vite + React + @emotion/react')
})

test('should update', async () => {
  expect(await page.textContent('button')).toMatch('count is: 0')
  await page.click('button')
  expect(await page.textContent('button')).toMatch('count is: 1')
})

test.runIf(isServe)('should hmr', async () => {
  editFile('src/App.tsx', (code) => code.replace('Vite + React + @emotion/react', 'Updated'))
  await expect.poll(() => page.textContent('h1')).toMatch('Hello Updated')

  editFile('src/Counter.tsx', (code) => code.replace('color: #646cff;', 'color: #d26ac2;'))

  await expect.poll(() => getColor('code')).toMatch('#d26ac2')

  // preserve state
  expect(await page.textContent('button')).toMatch('count is: 1')
})

test('should update button style', async () => {
  function getButtonBorderStyle() {
    return page.evaluate(() => {
      return window.getComputedStyle(document.querySelector('button')).border
    })
  }

  await page.evaluate(() => {
    return document.querySelector('button').style
  })

  expect(await getButtonBorderStyle()).toMatch('2px solid rgb(0, 0, 0)')

  if (isServe) {
    editFile('src/Counter.tsx', (code) =>
      code.replace('border: 2px solid #000', 'border: 4px solid red'),
    )

    await expect.poll(getButtonBorderStyle).toMatch('4px solid rgb(255, 0, 0)')

    // preserve state
    expect(await page.textContent('button')).toMatch('count is: 1')
  }
})
