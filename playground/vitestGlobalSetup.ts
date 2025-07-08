import path from 'node:path'
import fs from 'fs-extra'
import type { TestProject } from 'vitest/node'
import type { BrowserServer } from 'playwright-chromium'
import { chromium } from 'playwright-chromium'

let browserServer: BrowserServer | undefined

export async function setup({ provide }: TestProject): Promise<void> {
  process.env.NODE_ENV = process.env.VITE_TEST_BUILD
    ? 'production'
    : 'development'

  browserServer = await chromium.launchServer({
    headless: !process.env.VITE_DEBUG_SERVE,
    args: process.env.CI
      ? ['--no-sandbox', '--disable-setuid-sandbox']
      : undefined,
  })

  provide('wsEndpoint', browserServer.wsEndpoint())

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

  const playgrounds = (
    await fs.readdir(path.resolve(__dirname, '../playground'), {
      withFileTypes: true,
    })
  ).filter((dirent) => dirent.name !== 'node_modules' && dirent.isDirectory())
  for (const { name: playgroundName } of playgrounds) {
    // write vite proxy file to load vite from each playground
    await fs.writeFile(
      path.resolve(tempDir, `${playgroundName}/_vite-proxy.js`),
      "export * from 'vite';",
    )

    // also setup dedicated copy for plugin-react-oxc tests
    const oxcTestDir = path.resolve(
      __dirname,
      '../playground',
      playgroundName,
      '__tests__/oxc',
    )
    if (!(await fs.exists(oxcTestDir))) continue

    const variantPlaygroundName = `${playgroundName}__oxc`
    await fs.copy(
      path.resolve(tempDir, playgroundName),
      path.resolve(tempDir, variantPlaygroundName),
    )
    await fs.remove(
      path.resolve(
        tempDir,
        `${variantPlaygroundName}/node_modules/@vitejs/plugin-react`,
      ),
    )
    await fs.symlink(
      path.resolve(__dirname, '../packages/plugin-react-oxc'),
      path.resolve(
        tempDir,
        `${variantPlaygroundName}/node_modules/@vitejs/plugin-react`,
      ),
    )
    await fs.symlink(
      path.resolve(__dirname, '../packages/plugin-react-oxc/node_modules/vite'),
      path.resolve(tempDir, `${variantPlaygroundName}/node_modules/vite`),
    )
    await fs.copy(
      path.resolve(__dirname, '../packages/plugin-react-oxc/node_modules/.bin'),
      path.resolve(tempDir, `${variantPlaygroundName}/node_modules/.bin`),
    )
  }
}

export async function teardown(): Promise<void> {
  await browserServer?.close()
  if (!process.env.VITE_PRESERVE_BUILD_ARTIFACTS) {
    fs.removeSync(path.resolve(__dirname, '../playground-temp'))
  }
}
