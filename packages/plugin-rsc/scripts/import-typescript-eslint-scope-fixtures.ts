import fs from 'node:fs'
import path from 'node:path'
import { parseArgs as parseNodeArgs } from 'node:util'
import ts from 'typescript'

const scriptDir = path.dirname(new URL(import.meta.url).pathname)
const packageDir = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(packageDir, '..', '..')
const siblingSourceHint =
  '../typescript-eslint/packages/scope-manager/tests/fixtures'
const siblingSourceDir = path.resolve(
  repoRoot,
  '..',
  'typescript-eslint',
  'packages',
  'scope-manager',
  'tests',
  'fixtures',
)
const outputDir = path.join(
  packageDir,
  'src/transforms/fixtures/scope/typescript-eslint',
)

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})

async function main(): Promise<void> {
  const { values } = parseNodeArgs({
    args: process.argv.slice(2),
    options: {
      source: {
        type: 'string',
        short: 's',
      },
      help: {
        type: 'boolean',
        short: 'h',
      },
    },
    strict: true,
  })

  if (values.help) {
    printHelp()
    return
  }

  const sourceDir = resolveSourceDir(values.source)
  if (!sourceDir) {
    throw new Error(
      'Fixture source directory is not configured.\n' +
        'Pass --source <dir>, set TYPESCRIPT_ESLINT_SCOPE_FIXTURES_DIR, or place a sibling\n' +
        `typescript-eslint checkout at ${siblingSourceHint}`,
    )
  }

  fs.rmSync(outputDir, { recursive: true, force: true })

  const inputFiles = fs.globSync('**/*.{ts,tsx}', { cwd: sourceDir }).sort()
  for (const relativePath of inputFiles) {
    const inputPath = path.join(sourceDir, relativePath)
    const outputPath = path.join(
      outputDir,
      relativePath.replace(/\.(ts|tsx)$/, '.js'),
    )

    fs.mkdirSync(path.dirname(outputPath), { recursive: true })

    const input = fs.readFileSync(inputPath, 'utf8')
    const result = ts.transpileModule(input, {
      fileName: relativePath,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
        experimentalDecorators: true,
        useDefineForClassFields: false,
      },
      reportDiagnostics: true,
      transformers: undefined,
    })
    if (result.diagnostics?.length) {
      const message = ts.formatDiagnosticsWithColorAndContext(
        result.diagnostics,
        {
          getCanonicalFileName: (fileName) => fileName,
          getCurrentDirectory: () => packageDir,
          getNewLine: () => '\n',
        },
      )
      throw new Error(`Failed to transpile fixture ${relativePath}\n${message}`)
    }
    fs.writeFileSync(outputPath, result.outputText)
  }

  console.error(
    `Imported ${inputFiles.length} fixture(s) from ${sourceDir} into ${outputDir}`,
  )
}

function resolveSourceDir(cliSourceDir?: string): string | undefined {
  const candidates = [
    cliSourceDir,
    process.env['TYPESCRIPT_ESLINT_SCOPE_FIXTURES_DIR'],
    siblingSourceDir,
  ].filter((value): value is string => Boolean(value))

  return candidates.find((candidate) => fs.existsSync(candidate))
}

function printHelp(): void {
  console.log(`Usage: import-typescript-eslint-scope-fixtures [options]

Transpile the local typescript-eslint scope-manager fixtures into checked-in JS
fixtures under src/transforms/fixtures/scope/typescript-eslint.

Options:
  -s, --source <dir>  Source fixture directory
  -h, --help          Show this help

Source resolution order:
  1. --source <dir>
  2. TYPESCRIPT_ESLINT_SCOPE_FIXTURES_DIR
  3. sibling checkout at ${siblingSourceHint}

After import, regenerate snapshots with:
  cd packages/plugin-rsc && pnpm test -- scope.test.ts --update
`)
}
