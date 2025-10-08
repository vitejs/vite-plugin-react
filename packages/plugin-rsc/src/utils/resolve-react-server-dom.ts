import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)

let userReactServerDomPath: string | null | undefined

/**
 * Checks if user has react-server-dom-webpack installed in their project.
 * This should only be called in Node.js environments (build or server).
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
 * Resolves the import specifier for react-server-dom-webpack.
 * Returns the user's package name if installed, otherwise the vendored path.
 * This should only be called in Node.js environments (build or server).
 */
export function getReactServerDomImportPath(subpath: string): string {
  if (hasUserReactServerDom()) {
    // Use user's installed version
    return `react-server-dom-webpack/${subpath}`
  }

  // Fallback to vendored version
  return `@vitejs/plugin-rsc/vendor/react-server-dom/${subpath}`
}
