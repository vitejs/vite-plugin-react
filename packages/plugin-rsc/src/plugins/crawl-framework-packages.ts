import fs from 'node:fs'
import path from 'node:path'
import {
  type CrawlFrameworkPkgsOptions,
  crawlFrameworkPkgs,
  findClosestPkgJsonPath,
  findDepPkgJsonPath,
} from 'vitefu'

type CrawlOptions = Required<
  Pick<CrawlFrameworkPkgsOptions, 'isBuild' | 'isFrameworkPkgByJson'>
>

type PackageJson = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

/**
 * Crawl the framework packages of the app at `root` and of every linked
 * package it depends on, returning their names for `ssr.noExternal`.
 *
 * vitefu only descends into framework packages, so it misses the React
 * libraries imported by a workspace package that lists "react" in
 * "dependencies". Linked packages resolve outside node_modules and Vite treats
 * them as source, so the libraries they import need the same handling as the
 * app's own.
 */
export async function crawlFrameworkPackages(
  root: string,
  options: CrawlOptions,
): Promise<string[]> {
  const frameworkNames = new Set<string>()
  // names of the packages checked by earlier crawls
  const checked = new Set<string>()
  // crawl one at a time so each crawl skips the packages checked by earlier
  // ones, along with their dependencies. vitefu only passes the dependency
  // name, so if linked packages install different versions of a package, only
  // the first one found is checked.
  for (const dir of [root, ...(await findLinkedPackageDirs(root))]) {
    // package names, which differ from dependency names for npm aliases
    const otherNames: string[] = []
    const result = await crawlFrameworkPkgs({
      root: dir,
      isBuild: options.isBuild,
      isFrameworkPkgByName: (name) => (checked.has(name) ? false : undefined),
      isFrameworkPkgByJson(pkgJson) {
        const isFrameworkPkg = options.isFrameworkPkgByJson(pkgJson)
        if (!isFrameworkPkg) {
          otherNames.push(pkgJson.name)
        }
        return isFrameworkPkg
      },
    })
    for (const name of result.ssr.noExternal) {
      frameworkNames.add(name)
      checked.add(name)
    }
    for (const name of otherNames) {
      checked.add(name)
    }
  }
  return [...frameworkNames]
}

/**
 * Find the linked packages that `root` depends on, directly or through other
 * linked packages: workspace packages and `link:`/`file:` dependencies, which
 * resolve outside node_modules.
 */
async function findLinkedPackageDirs(root: string): Promise<string[]> {
  const rootPkgJsonPath = await findClosestPkgJsonPath(root)
  const rootPkgJson = rootPkgJsonPath && (await readPkgJson(rootPkgJsonPath))
  if (!rootPkgJsonPath || !rootPkgJson) {
    return []
  }
  const visited = new Set([fs.realpathSync(rootPkgJsonPath)])
  const dirs: string[] = []

  // visit the dependencies of the package at `dir`
  async function visitDependencies(dir: string, pkgJson: PackageJson) {
    const deps = [
      ...Object.keys(pkgJson.dependencies ?? {}),
      ...Object.keys(pkgJson.devDependencies ?? {}),
    ]
    await Promise.all(
      deps.map(async (dep) => {
        // the real path, so linked packages point outside node_modules
        const depPkgJsonPath = await findDepPkgJsonPath(dep, dir)
        if (
          !depPkgJsonPath ||
          isInNodeModules(depPkgJsonPath) ||
          visited.has(depPkgJsonPath)
        ) {
          return
        }
        visited.add(depPkgJsonPath)
        const depPkgJson = await readPkgJson(depPkgJsonPath)
        if (depPkgJson) {
          const depDir = path.dirname(depPkgJsonPath)
          dirs.push(depDir)
          await visitDependencies(depDir, depPkgJson)
        }
      }),
    )
  }

  await visitDependencies(path.dirname(rootPkgJsonPath), rootPkgJson)
  // sort for a stable crawl order, since dependencies resolve concurrently
  return dirs.sort()
}

function isInNodeModules(file: string): boolean {
  return /[/\\]node_modules[/\\]/.test(file)
}

async function readPkgJson(file: string): Promise<PackageJson | undefined> {
  try {
    return JSON.parse(await fs.promises.readFile(file, 'utf-8'))
  } catch {
    return undefined
  }
}
