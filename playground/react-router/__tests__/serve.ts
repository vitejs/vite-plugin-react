import path from 'node:path'
import {
  createBuilder,
  createServer,
  preview,
  type InlineConfig,
  type ViteDevServer,
} from 'vite'
import { isBuild, rootDir, setViteUrl } from '~utils'

export let viteServer: ViteDevServer

// The React Router plugin requires a config file, which the default serve
// disables, so load it explicitly here.
export async function serve() {
  const config: InlineConfig = {
    root: rootDir,
    configFile: path.join(rootDir, 'vite.config.ts'),
    logLevel: 'silent',
  }

  if (isBuild) {
    const builder = await createBuilder(config)
    await builder.buildApp()
    const server = await preview(config)
    setViteUrl(server.resolvedUrls!.local[0].replace(/\/$/, ''))
    return server
  }

  viteServer = await (
    await createServer({
      ...config,
      server: { watch: { usePolling: true, interval: 100 } },
    })
  ).listen()
  setViteUrl(viteServer.resolvedUrls!.local[0].replace(/\/$/, ''))
  return viteServer
}
