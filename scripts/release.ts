import { readFileSync, writeFileSync } from 'node:fs'
import { release } from '@vitejs/release-scripts'
import colors from 'picocolors'

release({
  repo: 'vite-plugin-react',
  packages: ['plugin-react', 'plugin-react-swc', 'plugin-react-oxc'],
  getPkgDir(pkg) {
    if (pkg === 'plugin-react-swc') {
      return `packages/${pkg}/dist`
    }
    return `packages/${pkg}`
  },
  toTag: (pkg, version) => `${pkg}@${version}`,
  logChangelog: async (pkgName) => {
    const changelog = readFileSync(`packages/${pkgName}/CHANGELOG.md`, 'utf-8')
    if (!changelog.includes('## Unreleased')) {
      throw new Error("Can't find '## Unreleased' section in CHANGELOG.md")
    }
    const index = changelog.indexOf('## Unreleased') + 13
    console.log(
      colors.dim(
        changelog.slice(index, changelog.indexOf('## ', index)).trim(),
      ),
    )
  },
  generateChangelog: async (pkgName, version) => {
    if (pkgName === 'plugin-react-swc') {
      console.log(colors.cyan('\nUpdating package.json version...'))
      const pkgJsonPath = `packages/${pkgName}/package.json`
      const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
      pkg.version = version
      writeFileSync(pkgJsonPath, `${JSON.stringify(pkg, null, 2)}\n`)
    }

    const changelog = readFileSync(`packages/${pkgName}/CHANGELOG.md`, 'utf-8')
    console.log(colors.cyan('\nUpdating CHANGELOG.md...'))
    const date = new Date().toISOString().slice(0, 10)
    writeFileSync(
      `packages/${pkgName}/CHANGELOG.md`,
      changelog.replace(
        '## Unreleased',
        `## Unreleased\n\n## ${version} (${date})`,
      ),
    )
  },
})
