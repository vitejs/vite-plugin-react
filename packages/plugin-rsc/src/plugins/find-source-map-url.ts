import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  isFileLoadingAllowed,
  type EnvironmentModuleNode,
  type Plugin,
  type ViteDevServer,
} from 'vite'
import { slash } from './vite-utils'

//
// support findSourceMapURL
// https://github.com/facebook/react/pull/29708
// https://github.com/facebook/react/pull/30741
//

export function vitePluginFindSourceMapURL(): Plugin[] {
  return [
    {
      name: 'rsc:findSourceMapURL',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = new URL(req.url!, `http://localhost`)
          if (url.pathname === '/__vite_rsc_findSourceMapURL') {
            let filename = url.searchParams.get('filename')!
            let environmentName = url.searchParams.get('environmentName')!
            try {
              const map = await findSourceMapURL(
                server,
                filename,
                environmentName,
              )
              res.setHeader('content-type', 'application/json')
              if (!map) res.statusCode = 404
              res.end(JSON.stringify(map ?? {}))
            } catch (e) {
              next(e)
            }
            return
          }
          next()
        })
      },
    },
  ]
}

async function findSourceMapURL(
  server: ViteDevServer,
  filename: string,
  environmentName: string,
): Promise<object | undefined> {
  // A `file://` frame comes from a file that Node loads natively instead of through Vite.
  // React drops `node_modules` frames by default, so this is mostly reached with a custom
  // `filterStackFrame` or with project files that are externalized or imported natively.
  // https://github.com/facebook/react/blob/edae846a9a17442c00429f2b15375afbfa0376c9/packages/react-server/src/ReactFlightServer.js#L195-L204
  // TODO: consider removing this branch. It only gives DevTools the raw text of rarely seen frames,
  // but it is the only branch that reads arbitrary files from disk, so it depends on Vite's `server.fs` rules.
  // The browser-side `findSourceMapURL` could return `null` for `file://` instead.
  if (filename.startsWith('file://')) {
    filename = slash(fileURLToPath(filename))
    // The browser requests this and the response includes the file contents,
    // so check access the same way as Vite's `/@fs/` serving for the client.
    if (
      isFileLoadingAllowed(server.environments.client.config, filename) &&
      fs.existsSync(filename)
    ) {
      // line-by-line identity source map
      const content = fs.readFileSync(filename, 'utf-8')
      return {
        version: 3,
        sources: [filename],
        sourcesContent: [content],
        mappings: 'AAAA' + ';AACA'.repeat(content.split('\n').length),
      }
    }
    return
  }

  // server component stack, replace log, `registerServerReference`, etc...
  let mod: EnvironmentModuleNode | undefined
  let map:
    | NonNullable<EnvironmentModuleNode['transformResult']>['map']
    | undefined
  if (environmentName === 'Server') {
    mod = server.environments.rsc!.moduleGraph.getModuleById(filename)
    // React extracts stacktrace via resetting `prepareStackTrace` on the server
    // and let browser devtools handle the mapping.
    // https://github.com/facebook/react/blob/4a36d3eab7d9bbbfae62699989aa95e5a0297c16/packages/react-server/src/ReactFlightStackConfigV8.js#L15-L20
    // This means it has additional +2 line offset due to Vite's module runner
    // function wrapper. We need to correct it just like Vite module runner.
    // https://github.com/vitejs/vite/blob/d94e7b25564abb81ab7b921d4cd44d0f0d22fec4/packages/vite/src/shared/utils.ts#L58-L69
    // https://github.com/vitejs/vite/blob/d94e7b25564abb81ab7b921d4cd44d0f0d22fec4/packages/vite/src/node/ssr/fetchModule.ts#L142-L146
    map = mod?.transformResult?.map
    if (map && map.mappings) {
      map = { ...map, mappings: (';;' + map.mappings) as any }
    }
  }

  const base = server.config.base.slice(0, -1)

  // `createServerReference(... findSourceMapURL ...)` called on browser
  if (environmentName === 'Client') {
    try {
      const url = new URL(filename).pathname.slice(base.length)
      mod = server.environments.client.moduleGraph.urlToModuleMap.get(url)
      map = mod?.transformResult?.map
    } catch (e) {}
  }

  if (mod && map) {
    // fix sources to match Vite's module url on browser
    return { ...map, sources: [base + mod.url] }
  }
}
