import { publish } from '@vitejs/release-scripts'

publish({
  getPkgDir(pkg) {
    if (pkg === 'plugin-react-swc') {
      return `packages/${pkg}/dist`
    }
    return `packages/${pkg}`
  },
})
