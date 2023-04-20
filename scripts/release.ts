import { readFileSync, writeFileSync } from 'node:fs'
import { release } from '@vitejs/release-scripts'
import colors from 'picocolors'

release({
  repo: 'vite-plugin-react',
  packages: ['plugin-react'],
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
