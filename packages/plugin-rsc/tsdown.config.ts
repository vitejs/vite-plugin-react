import fs from 'node:fs'
import path from 'node:path'
import { build } from 'esbuild'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/plugin.ts',
    'src/browser.ts',
    'src/ssr.tsx',
    'src/rsc.tsx',
    'src/core/browser.ts',
    'src/core/ssr.ts',
    'src/core/rsc.ts',
    'src/core/plugin.ts',
    'src/react/browser.ts',
    'src/react/ssr.ts',
    'src/react/rsc.ts',
    'src/transforms/index.ts',
    'src/plugins/cjs.ts',
    'src/utils/rpc.ts',
    'src/utils/encryption-runtime.ts',
  ],
  format: ['esm'],
  // TODO: specify explicitly
  inlineOnly: false,
  fixedExtension: false,
  external: [/^virtual:/, /^@vitejs\/plugin-rsc\/vendor\//],
  dts: {
    sourcemap: process.argv.slice(2).includes('--sourcemap'),
  },
  plugins: [
    {
      name: 'vendor-react-server-dom',
      async buildStart() {
        fs.rmSync('./dist/vendor/', { recursive: true, force: true })
        fs.mkdirSync('./dist/vendor', { recursive: true })
        fs.cpSync(
          './node_modules/react-server-dom-webpack',
          './dist/vendor/react-server-dom',
          { recursive: true, dereference: true },
        )
        fs.rmSync('./dist/vendor/react-server-dom/node_modules', {
          recursive: true,
          force: true,
        })
        // Convert CJS entry files to ESM so pure ESM runtimes (Cloudflare
        // Workers, Deno Deploy) don't fail with "require is not defined".
        await convertVendorToEsm('./dist/vendor/react-server-dom')
      },
    },
  ],
}) as any

const EXTERNALS = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
]

// Convert CJS entry files in the vendor directory to ESM in-place using esbuild.
async function convertVendorToEsm(vendorDir: string) {
  const entries = fs
    .readdirSync(vendorDir)
    .filter((f) => f.endsWith('.js'))
    .filter((f) => {
      const content = fs.readFileSync(path.join(vendorDir, f), 'utf-8')
      return content.includes('require(') || content.includes('exports.')
    })

  for (const entry of entries) {
    const entryPath = path.join(vendorDir, entry)
    const content = fs.readFileSync(entryPath, 'utf-8')

    let result
    try {
      result = await build({
        entryPoints: [entryPath],
        bundle: true,
        format: 'esm',
        write: false,
        platform: 'neutral',
        external: [
          ...EXTERNALS,
          'node:*',
          'util',
          'crypto',
          'stream',
          'async_hooks',
        ],
        sourcemap: false,
        logLevel: 'silent',
      })
    } catch {
      continue
    }

    let code = result.outputFiles[0]!.text

    // esbuild wraps CJS externals as __require("react") inside __commonJS
    // wrappers instead of lifting them to top-level imports. Replace with ESM.
    const externalRequires = new Map<string, string>()
    code = code.replace(/__require\("([^"]+)"\)/g, (match, specifier) => {
      if (!EXTERNALS.includes(specifier)) return match
      const varName =
        externalRequires.get(specifier) ??
        `__ext_${specifier.replace(/[^a-zA-Z0-9]/g, '_')}`
      externalRequires.set(specifier, varName)
      return varName
    })
    if (externalRequires.size > 0) {
      const imports = Array.from(externalRequires.entries())
        .map(([spec, varName]) => `import * as ${varName} from "${spec}";`)
        .join('\n')
      code = imports + '\n' + code
    }

    // Remove the __require shim (references `require` which doesn't exist in ESM runtimes)
    if (!code.includes('__require(')) {
      const lines = code.split('\n')
      const startIdx = lines.findIndex((l) => l.startsWith('var __require ='))
      if (startIdx >= 0) {
        let endIdx = startIdx
        for (let i = startIdx; i < lines.length; i++) {
          if (lines[i]!.startsWith('});')) {
            endIdx = i
            break
          }
        }
        lines.splice(startIdx, endIdx - startIdx + 1)
        code = lines.join('\n')
      }
    }

    // esbuild only generates `export default`. Add named exports by scanning the CJS source.
    const namedExports = extractCjsExportNames(content, entryPath)
    if (namedExports.length > 0) {
      code = code.replace(
        /^export default (.+);$/m,
        [
          `var __cjs_default__ = $1;`,
          `export default __cjs_default__;`,
          `export var { ${namedExports.join(', ')} } = __cjs_default__;`,
        ].join('\n'),
      )
    }

    fs.writeFileSync(entryPath, code)
  }

  fs.rmSync(path.join(vendorDir, 'cjs'), { recursive: true, force: true })
}

function extractCjsExportNames(content: string, filePath: string): string[] {
  const names = new Set<string>()
  for (const m of content.matchAll(/exports\.(\w+)\s*=/g)) {
    if (m[1] !== '__esModule') names.add(m[1]!)
  }
  const requireMatch = content.match(
    /require\(['"](\.\/cjs\/[^'"]+\.production[^'"]*)['"]\)/,
  )
  if (requireMatch) {
    try {
      const cjsPath = path.resolve(path.dirname(filePath), requireMatch[1]!)
      const cjsContent = fs.readFileSync(cjsPath, 'utf-8')
      for (const m of cjsContent.matchAll(/exports\.(\w+)\s*=/g)) {
        if (m[1] !== '__esModule') names.add(m[1]!)
      }
    } catch {}
  }
  return Array.from(names)
}
