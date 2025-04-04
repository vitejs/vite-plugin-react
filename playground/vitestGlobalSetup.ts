import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import type { BrowserServer } from 'playwright-chromium'
import { chromium } from 'playwright-chromium'

const DIR = path.join(os.tmpdir(), 'vitest_playwright_global_setup')

let browserServer: BrowserServer | undefined

export async function setup(): Promise<void> {
  process.env.NODE_ENV = process.env.VITE_TEST_BUILD
    ? 'production'
    : 'development'

  browserServer = await chromium.launchServer({
    headless: !process.env.VITE_DEBUG_SERVE,
    args: process.env.CI
      ? ['--no-sandbox', '--disable-setuid-sandbox']
      : undefined,
  })

  await fs.mkdirp(DIR)
  await fs.writeFile(path.join(DIR, 'wsEndpoint'), browserServer.wsEndpoint())

  const tempDir = path.resolve(__dirname, '../playground-temp')
  await fs.ensureDir(tempDir)
  await fs.emptyDir(tempDir)
  await fs
    .copy(path.resolve(__dirname, '../playground'), tempDir, {
      dereference: false,
      filter(file) {
        file = file.replace(/\\/g, '/')
        return !file.includes('__tests__') && !file.match(/dist(\/|$)/)
      },
    })
    .catch(async (error) => {
      if (error.code === 'EPERM' && error.syscall === 'symlink') {
        throw new Error(
          'Could not create symlinks. On Windows, consider activating Developer Mode to allow non-admin users to create symlinks by following the instructions at https://docs.microsoft.com/en-us/windows/apps/get-started/enable-your-device-for-development.',
        )
      } else {
        throw error
      }
    })

  // also setup dedicated copy for plugin-react-oxc tests
  const oxcIgnoredDirs = new Set([
    'compiler',
    'compiler-react-18',
    'react-classic',
    'react-emotion',
    'node_modules',
  ])
  const oxcPlaygrounds = (
    await fs.readdir(path.resolve(__dirname, '../playground'), {
      withFileTypes: true,
    })
  ).filter((dirent) => !oxcIgnoredDirs.has(dirent.name) && dirent.isDirectory())
  for (const { name: playgroundName } of oxcPlaygrounds) {
    await fs.copy(
      path.resolve(tempDir, playgroundName),
      path.resolve(tempDir, `${playgroundName}-oxc`),
    )
    await fs.remove(
      path.resolve(
        tempDir,
        `${playgroundName}-oxc/node_modules/@vitejs/plugin-react`,
      ),
    )
    await fs.symlink(
      path.resolve(__dirname, '../packages/plugin-react-oxc'),
      path.resolve(
        tempDir,
        `${playgroundName}-oxc/node_modules/@vitejs/plugin-react`,
      ),
    )
    await fs.symlink(
      path.resolve(__dirname, '../packages/plugin-react-oxc/node_modules/vite'),
      path.resolve(tempDir, `${playgroundName}-oxc/node_modules/vite`),
    )
    await fs.copy(
      path.resolve(__dirname, '../packages/plugin-react-oxc/node_modules/.bin'),
      path.resolve(tempDir, `${playgroundName}-oxc/node_modules/.bin`),
    )
  }
}

export async function teardown(): Promise<void> {
  await browserServer?.close()
  if (!process.env.VITE_PRESERVE_BUILD_ARTIFACTS) {
    fs.removeSync(path.resolve(__dirname, '../playground-temp'))
  }
}
