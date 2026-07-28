import { generateChangelog } from '@vitejs/release-scripts'
import { versionBump } from 'bumpp'

async function main() {
  const release = process.env.RELEASE_VERSION || process.env.RELEASE_TYPE
  const pkgPath = 'packages/plugin-rsc/package.json'

  await versionBump({
    files: [pkgPath],
    release,
    commit: false,
    tag: false,
    push: false,
    printCommits: false,
    confirm: !release,
  })

  await generateChangelog({
    getPkgDir: () => 'packages/plugin-rsc',
    tagPrefix: 'plugin-rsc@',
  })
}

main().catch((error) => {
  console.error('Error preparing RSC release:', error)
  process.exit(1)
})
