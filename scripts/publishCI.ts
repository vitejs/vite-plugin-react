import { publish } from '@vitejs/release-scripts'

publish({
  provenance: true,
  getPkgDir(pkg) {
    if (pkg === 'plugin-react-swc') {
      return `packages/${pkg}/dist`
    }
    return `packages/${pkg}`
  },
})
