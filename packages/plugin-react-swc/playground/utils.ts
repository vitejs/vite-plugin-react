import { readFileSync, writeFileSync } from 'node:fs'
import { type Locator, type Page, expect } from '@playwright/test'
import {
  build,
  createServer,
  loadConfigFromFile,
  mergeConfig,
  preview,
} from 'vite'

export const setupWaitForLogs = async (page: Page) => {
  let logs: string[] = []
  page.on('console', (log) => {
    logs.push(log.text())
  })
  return (...messages: (string | RegExp)[]) =>
    expect
      .poll(() => {
        if (
          messages.every((m) =>
            typeof m === 'string'
              ? logs.includes(m)
              : logs.some((l) => m.test(l)),
          )
        ) {
          logs = []
          return true
        }
        return logs
      })
      .toBe(true)
}

let port = 5173
export const setupDevServer = async (name: string) => {
  process.env['NODE_ENV'] = 'development'
  const root = `playground-temp/${name}`
  const res = await loadConfigFromFile(
    { command: 'serve', mode: 'development' },
    undefined,
    root,
  )
  const testConfig = mergeConfig(res!.config, {
    root,
    logLevel: 'silent',
    configFile: false,
    server: { port: port++ },
  })
  const server = await (await createServer(testConfig)).listen()
  return {
    testUrl: `http://localhost:${server.config.server.port}${server.config.base}`,
    server,
    editFile: (
      name: string,
      ...replacements: [searchValue: string, replaceValue: string][]
    ) => {
      const path = `${root}/${name}`
      let content = readFileSync(path, 'utf-8')
      for (const [search, replace] of replacements) {
        if (!content.includes(search)) {
          throw new Error(`'${search}' not found in ${name}`)
        }
        content = content.replace(search, replace)
      }
      writeFileSync(path, content)
    },
  }
}

export const setupBuildAndPreview = async (name: string) => {
  process.env['NODE_ENV'] = 'production'
  const root = `playground-temp/${name}`
  const res = await loadConfigFromFile(
    { command: 'build', mode: 'production' },
    undefined,
    root,
  )
  const testConfig = mergeConfig(
    { root, logLevel: 'silent', configFile: false, preview: { port: port++ } },
    res!.config,
  )
  await build(testConfig)
  const server = await preview(testConfig)
  return {
    testUrl: server.resolvedUrls!.local[0],
    server,
  }
}

export const expectColor = async (
  locator: Locator,
  property: 'color' | 'backgroundColor',
  color: string,
) => {
  await expect
    .poll(async () =>
      rgbToHex(
        await locator.evaluate(
          (el, prop) => getComputedStyle(el)[prop],
          property,
        ),
      ),
    )
    .toBe(color)
}

const rgbToHex = (rgb: string): string => {
  const [_, rs, gs, bs] = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)!
  return (
    '#' +
    componentToHex(parseInt(rs, 10)) +
    componentToHex(parseInt(gs, 10)) +
    componentToHex(parseInt(bs, 10))
  )
}

const componentToHex = (c: number): string => {
  const hex = c.toString(16)
  return hex.length === 1 ? '0' + hex : hex
}
