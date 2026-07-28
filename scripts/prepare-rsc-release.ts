import { readFileSync, writeFileSync } from 'node:fs'
import { generateChangelog } from '@vitejs/release-scripts'
import * as semver from 'semver'

async function main() {
  const version = process.argv[2]
  const pkgPath = 'packages/plugin-rsc/package.json'

  if (!version || semver.valid(version) !== version) {
    throw new Error(`Invalid version: ${version || '(missing)'}`)
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  if (pkg.version === version) {
    throw new Error(`Version is already ${version}`)
  }

  pkg.version = version
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

  await generateChangelog({
    getPkgDir: () => 'packages/plugin-rsc',
    tagPrefix: 'plugin-rsc@',
  })
}

main().catch((error) => {
  console.error('Error preparing RSC release:', error)
  process.exit(1)
})
