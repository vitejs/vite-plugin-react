import { publish } from '@vitejs/release-scripts'
import { validatePublishVersion } from './release-utils.ts'

async function main() {
  const tag = process.argv[2]
  const version = tag?.split('@')[1]
  if (!version) throw new Error(`Invalid package tag ${JSON.stringify(tag)}`)
  validatePublishVersion(version)

  await publish({
    getPkgDir(pkg) {
      if (pkg === 'plugin-react-swc') {
        return `packages/${pkg}/dist`
      }
      return `packages/${pkg}`
    },
  })
}

main().catch((error) => {
  console.error('Error publishing package:', error)
  process.exit(1)
})
