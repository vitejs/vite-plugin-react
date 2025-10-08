import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)

let userReactServerDomPath: string | null | undefined

/**
 * Checks if user has react-server-dom-webpack installed in their project
 */
export function hasUserReactServerDom(): boolean {
  if (userReactServerDomPath === undefined) {
    try {
      // Try to resolve from user's project (process.cwd())
      const userRequire = createRequire(
        pathToFileURL(process.cwd() + '/package.json').href,
      )
      userReactServerDomPath = userRequire.resolve(
        'react-server-dom-webpack/package.json',
      )
      userReactServerDomPath = userReactServerDomPath.replace(
        '/package.json',
        '',
      )
    } catch {
      // User doesn't have react-server-dom-webpack installed
      userReactServerDomPath = null
    }
  }
  return userReactServerDomPath !== null
}

/**
 * Resolves the path to react-server-dom-webpack.
 * Checks if user has it installed in their project, otherwise falls back to vendored version.
 */
export function resolveReactServerDom(subpath: string): string {
  if (hasUserReactServerDom()) {
    // Use user's installed version
    return pathToFileURL(userReactServerDomPath + '/' + subpath).href
  }

  // Fallback to vendored version
  return pathToFileURL(
    require.resolve('@vitejs/plugin-rsc/vendor/react-server-dom/' + subpath),
  ).href
}
