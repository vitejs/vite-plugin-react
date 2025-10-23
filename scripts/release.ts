import { generateChangelog, release } from '@vitejs/release-scripts'
import { readFileSync, writeFileSync } from 'node:fs'
import colors from 'picocolors'

const nextH2RE = /^## /gm

release({
  repo: 'vite-plugin-react',
  packages: [
    'plugin-react',
    'plugin-react-swc',
    'plugin-react-oxc',
    'plugin-rsc',
  ],
  getPkgDir(pkg) {
    if (pkg === 'plugin-react-swc') {
      return `packages/${pkg}/dist`
    }
    return `packages/${pkg}`
  },
  toTag: (pkg, version) => `${pkg}@${version}`,
  logChangelog: async (pkgName) => {
    if (pkgName === 'plugin-rsc') return

    const changelog = readFileSync(`packages/${pkgName}/CHANGELOG.md`, 'utf-8')
    if (!changelog.includes('## Unreleased')) {
      throw new Error("Can't find '## Unreleased' section in CHANGELOG.md")
    }
    const index = changelog.indexOf('## Unreleased') + 13
    nextH2RE.lastIndex = index
    const nextH2Pos = nextH2RE.exec(changelog)?.index
    console.log(colors.dim(changelog.slice(index, nextH2Pos).trim()))
  },
  generateChangelog: async (pkgName, version) => {
    if (pkgName === 'plugin-rsc') {
      await generateChangelog({
        getPkgDir: () => `packages/${pkgName}`,
        tagPrefix: `${pkgName}@`,
      })
      return
    }

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
