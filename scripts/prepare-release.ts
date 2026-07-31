import { readFileSync, writeFileSync } from 'node:fs'
import { generateChangelog, prepareRelease } from '@vitejs/release-scripts'

const releasePackages = [
  'plugin-react',
  'plugin-react-swc',
  'plugin-rsc',
] as const

async function main() {
  const { tag, version } = await prepareRelease({
    packages: releasePackages,
    pkg: process.argv[2],
    release: process.argv[3],
    generateChangelog: async (pkg, version) => {
      const pkgDir = `packages/${pkg}`
      if (pkg === 'plugin-rsc') {
        await generateChangelog({
          getPkgDir: () => pkgDir,
          tagPrefix: `${pkg}@`,
        })
        return
      }
      const changelogPath = `${pkgDir}/CHANGELOG.md`
      const changelog = readFileSync(changelogPath, 'utf-8')
      const date = new Date().toISOString().slice(0, 10)
      writeFileSync(
        changelogPath,
        changelog.replace(
          '## Unreleased',
          `## Unreleased\n\n## ${version} (${date})`,
        ),
      )
    },
  })

  console.log(`tag=${tag}\nversion=${version}`)
}

main().catch((error) => {
  console.error('Error preparing release:', error)
  process.exit(1)
})
