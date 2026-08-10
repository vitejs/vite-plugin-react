import { publish } from '@vitejs/release-scripts'

async function main() {
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
