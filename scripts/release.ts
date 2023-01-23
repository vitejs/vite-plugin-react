import { release } from '@vitejs/release-scripts'
import { logRecentCommits, run } from './releaseUtils'

release({
  repo: 'vite-plugin-react',
  packages: ['plugin-react'],
  toTag: (pkg, version) => `${pkg}@${version}`,
  logChangelog: async (pkgName) => {
    await logRecentCommits(pkgName)
  },
  generateChangelog: async (pkgName) => {
    await run(
      'npx',
      [
        'conventional-changelog',
        '-p',
        'angular',
        '-i',
        'CHANGELOG.md',
        '-s',
        '--commit-path',
        '.',
        '--lerna-package',
        pkgName,
      ],
      { cwd: `packages/${pkgName}` },
    )
  },
})
