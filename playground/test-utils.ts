// test utils used in e2e tests for playgrounds.
// `import { getColor } from '~utils'`

import fs from 'node:fs'
import path from 'node:path'
import type { ConsoleMessage, ElementHandle } from 'playwright-chromium'
import { expect } from 'vitest'
import { isBuild, page, testDir } from './vitestSetup'

export * from './vitestSetup'

// make sure these ports are unique
export const ports = {
  'ssr-react': 9604,
}
export const hmrPorts = {
  'ssr-react': 24685,
}

function componentToHex(c: number): string {
  const hex = c.toString(16)
  return hex.length === 1 ? '0' + hex : hex
}

function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (match) {
    const [_, rs, gs, bs] = match
    return (
      '#' +
      componentToHex(parseInt(rs, 10)) +
      componentToHex(parseInt(gs, 10)) +
      componentToHex(parseInt(bs, 10))
    )
  } else {
    return '#000000'
  }
}

const timeout = (n: number) => new Promise((r) => setTimeout(r, n))

async function toEl(el: string | ElementHandle): Promise<ElementHandle> {
  if (typeof el === 'string') {
    return await page.$(el)
  }
  return el
}

export async function getColor(el: string | ElementHandle): Promise<string> {
  el = await toEl(el)
  const rgb = await el.evaluate((el) => getComputedStyle(el as Element).color)
  return rgbToHex(rgb)
}

export async function getBg(el: string | ElementHandle): Promise<string> {
  el = await toEl(el)
  return el.evaluate((el) => getComputedStyle(el as Element).backgroundImage)
}

export async function getBgColor(el: string | ElementHandle): Promise<string> {
  el = await toEl(el)
  return el.evaluate((el) => getComputedStyle(el as Element).backgroundColor)
}

export function readFile(filename: string): string {
  return fs.readFileSync(path.resolve(testDir, filename), 'utf-8')
}

export function editFile(
  filename: string,
  replacer: (str: string) => string,
  runInBuild: boolean = false,
): void {
  if (isBuild && !runInBuild) return
  filename = path.resolve(testDir, filename)
  const content = fs.readFileSync(filename, 'utf-8')
  const modified = replacer(content)
  fs.writeFileSync(filename, modified)
}

export function addFile(filename: string, content: string): void {
  fs.writeFileSync(path.resolve(testDir, filename), content)
}

export function removeFile(filename: string): void {
  fs.unlinkSync(path.resolve(testDir, filename))
}

/**
 * Poll a getter until the value it returns includes the expected value.
 */
export async function untilUpdated(
  poll: () => string | Promise<string>,
  expected: string,
  runInBuild = false,
): Promise<void> {
  if (isBuild && !runInBuild) return
  const maxTries = process.env.CI ? 200 : 50
  for (let tries = 0; tries < maxTries; tries++) {
    const actual = (await poll()) ?? ''
    if (actual.indexOf(expected) > -1 || tries === maxTries - 1) {
      expect(actual).toMatch(expected)
      break
    } else {
      await timeout(50)
    }
  }
}

type UntilBrowserLogAfterCallback = (logs: string[]) => PromiseLike<void> | void

export async function untilBrowserLogAfter(
  operation: () => any,
  target: string | RegExp | Array<string | RegExp>,
  expectOrder?: boolean,
  callback?: UntilBrowserLogAfterCallback,
): Promise<string[]>
export async function untilBrowserLogAfter(
  operation: () => any,
  target: string | RegExp | Array<string | RegExp>,
  callback?: UntilBrowserLogAfterCallback,
): Promise<string[]>
export async function untilBrowserLogAfter(
  operation: () => any,
  target: string | RegExp | Array<string | RegExp>,
  arg3?: boolean | UntilBrowserLogAfterCallback,
  arg4?: UntilBrowserLogAfterCallback,
): Promise<string[]> {
  const expectOrder = typeof arg3 === 'boolean' ? arg3 : false
  const callback = typeof arg3 === 'boolean' ? arg4 : arg3

  const promise = untilBrowserLog(target, expectOrder)
  await operation()
  const logs = await promise
  if (callback) {
    await callback(logs)
  }
  return logs
}

async function untilBrowserLog(
  target?: string | RegExp | Array<string | RegExp>,
  expectOrder = true,
): Promise<string[]> {
  let resolve: () => void
  let reject: (reason: any) => void
  const promise = new Promise<void>((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })

  const logs = []

  try {
    const isMatch = (matcher: string | RegExp) => (text: string) =>
      typeof matcher === 'string' ? text === matcher : matcher.test(text)

    let processMsg: (text: string) => boolean

    if (!target) {
      processMsg = () => true
    } else if (Array.isArray(target)) {
      if (expectOrder) {
        const remainingTargets = [...target]
        processMsg = (text: string) => {
          const nextTarget = remainingTargets.shift()
          expect(text).toMatch(nextTarget)
          return remainingTargets.length === 0
        }
      } else {
        const remainingMatchers = target.map(isMatch)
        processMsg = (text: string) => {
          const nextIndex = remainingMatchers.findIndex((matcher) =>
            matcher(text),
          )
          if (nextIndex >= 0) {
            remainingMatchers.splice(nextIndex, 1)
          }
          return remainingMatchers.length === 0
        }
      }
    } else {
      processMsg = isMatch(target)
    }

    const handleMsg = (msg: ConsoleMessage) => {
      try {
        const text = msg.text()
        logs.push(text)
        const done = processMsg(text)
        if (done) {
          resolve()
        }
      } catch (err) {
        reject(err)
      }
    }

    page.on('console', handleMsg)
  } catch (err) {
    reject(err)
  }

  await promise

  return logs
}

/**
 * Before implementing a new util, check if it's not available in core https://github.com/vitejs/vite/blob/main/playground/test-utils.ts
 */
