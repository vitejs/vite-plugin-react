import fs from 'node:fs'
import path from 'node:path'
import {
  crawlFrameworkPkgs,
  findClosestPkgJsonPath,
  findDepPkgJsonPath,
} from 'vitefu'

type CrawlOptions = Pick<
  Parameters<typeof crawlFrameworkPkgs>[0],
  'isBuild' | 'isFrameworkPkgByJson'
>

/**
 * Crawl the framework packages of the app at `root` and of every linked
 * package it depends on, returning their names for `ssr.noExternal`.
 *
 * vitefu only descends into framework packages, so React libraries imported
 * by a workspace package that lists "react" in "dependencies" are missed.
 * Linked packages resolve outside node_modules and Vite treats them as source,
 * so the libraries they import need the same handling as the app's own.
 */
export async function crawlFrameworkPackages(
  root: string,
  options: CrawlOptions,
): Promise<string[]> {
  const result = await crawlFrameworkPkgs({ root, ...options })
  const names = new Set(result.ssr.noExternal)
  for (const dir of await findLinkedPackageDirs(root)) {
    const linked = await crawlFrameworkPkgs({
      root: dir,
      ...options,
      // skip packages found already, along with their dependencies
      isFrameworkPkgByName: (name) => (names.has(name) ? false : undefined),
    })
    for (const name of linked.ssr.noExternal) {
      names.add(name)
    }
  }
  return [...names]
}

async function findLinkedPackageDirs(root: string): Promise<string[]> {
  const rootPkgJsonPath = await findClosestPkgJsonPath(root)
  if (!rootPkgJsonPath) {
    return []
  }
  const seen = new Set([fs.realpathSync(rootPkgJsonPath)])
  const dirs: string[] = []
  const queue = [rootPkgJsonPath]
  while (queue.length > 0) {
    const pkgJsonPath = queue.shift()!
    let pkgJson: Record<string, any>
    try {
      pkgJson = JSON.parse(await fs.promises.readFile(pkgJsonPath, 'utf-8'))
    } catch {
      continue
    }
    const deps = [
      ...Object.keys(pkgJson['dependencies'] ?? {}),
      ...Object.keys(pkgJson['devDependencies'] ?? {}),
    ]
    await Promise.all(
      deps.map(async (dep) => {
        const depPkgJsonPath = await findDepPkgJsonPath(
          dep,
          path.dirname(pkgJsonPath),
        )
        if (
          !depPkgJsonPath ||
          seen.has(depPkgJsonPath) ||
          /[/\\]node_modules[/\\]/.test(depPkgJsonPath)
        ) {
          return
        }
        seen.add(depPkgJsonPath)
        dirs.push(path.dirname(depPkgJsonPath))
        queue.push(depPkgJsonPath)
      }),
    )
  }
  return dirs.sort()
}
