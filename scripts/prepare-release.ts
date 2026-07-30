import { readFileSync, writeFileSync } from 'node:fs'
import { generateChangelog } from '@vitejs/release-scripts'
import { versionBump } from 'bumpp'
import { validatePublishVersion } from './release-utils.ts'

const releasePackages = [
  'plugin-react',
  'plugin-react-swc',
  'plugin-rsc',
] as const

type ReleasePackage = (typeof releasePackages)[number]

function parseReleasePackage(value: string | undefined): ReleasePackage {
  if ((releasePackages as readonly (string | undefined)[]).includes(value)) {
    return value as ReleasePackage
  }
  throw new Error(
    `Invalid release package ${JSON.stringify(value)}. Expected one of: ${releasePackages.join(', ')}`,
  )
}

async function main() {
  const releasePackage = parseReleasePackage(process.argv[2])
  const release = process.argv[3]

  const pkgDir = `packages/${releasePackage}`
  const pkgPath = `${pkgDir}/package.json`

  await versionBump({
    files: [pkgPath],
    release,
    commit: false,
    tag: false,
    push: false,
    printCommits: false,
    confirm: !release,
  })

  const { version } = JSON.parse(readFileSync(pkgPath, 'utf-8')) as {
    version: string
  }
  validatePublishVersion(version)

  if (releasePackage === 'plugin-rsc') {
    await generateChangelog({
      getPkgDir: () => pkgDir,
      tagPrefix: `${releasePackage}@`,
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
}

main().catch((error) => {
  console.error('Error preparing release:', error)
  process.exit(1)
})
