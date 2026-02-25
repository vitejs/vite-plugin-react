import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { x } from 'tinyexec'

test.describe('sourcemap', () => {
  const root = 'examples/starter'

  test('build --sourcemap produces valid sourcemaps without rsc:patch-react-server-dom-webpack warnings', async () => {
    // Clean previous build
    fs.rmSync(path.join(root, 'dist'), { recursive: true, force: true })

    const result = await x('pnpm', ['build', '--sourcemap'], {
      nodeOptions: { cwd: root },
      throwOnError: true,
    })
    expect(result.exitCode).toBe(0)

    // The rsc:patch-react-server-dom-webpack plugin replaces
    // __webpack_require__ with __vite_rsc_require__ (different lengths).
    // With the MagicString fix, this transform preserves the sourcemap
    // chain and must not appear in any "Sourcemap" warnings.
    const output = result.stdout + result.stderr
    expect(output).not.toContain(
      '[plugin rsc:patch-react-server-dom-webpack] Sourcemap is likely to be incorrect',
    )

    // Verify the rsc build output has a valid sourcemap with non-empty mappings.
    // The rsc bundle contains the vendored react-server-dom-webpack code
    // that goes through the __webpack_require__ transform.
    const rscDir = path.join(root, 'dist/rsc')
    const mapFiles = fs.readdirSync(rscDir).filter((f) => f.endsWith('.js.map'))
    expect(mapFiles.length).toBeGreaterThan(0)

    for (const mapFile of mapFiles) {
      const map = JSON.parse(
        fs.readFileSync(path.join(rscDir, mapFile), 'utf-8'),
      )
      // Sourcemap must have non-empty mappings
      expect(map.mappings).toBeTruthy()
      expect(map.mappings.length).toBeGreaterThan(0)
    }
  })
})
