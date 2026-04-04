import fs from 'node:fs'
import path from 'node:path'
import { parseArgs as parseNodeArgs } from 'node:util'

const scriptDir = path.dirname(new URL(import.meta.url).pathname)
const packageDir = path.resolve(scriptDir, '..')
const defaultInputFile = path.join(packageDir, 'src/transforms/hoist.test.ts')
const defaultOutputDir = path.join(packageDir, 'src/transforms/fixtures/scope')

main()

function main(): void {
  const { values } = parseNodeArgs({
    args: process.argv.slice(2),
    options: {
      input: {
        type: 'string',
        short: 'i',
      },
      outDir: {
        type: 'string',
        short: 'o',
      },
      prefix: {
        type: 'string',
      },
      force: {
        type: 'boolean',
        short: 'f',
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
    process.exit(0)
  }

  const inputFile = path.resolve(values.input ?? defaultInputFile)
  const outDir = path.resolve(values.outDir ?? defaultOutputDir)
  const prefix = values.prefix ?? 'hoist-'
  const force = values.force ?? false

  const source = fs.readFileSync(inputFile, 'utf8')
  const fixtures = extractFixtures(source)

  if (fixtures.length === 0) {
    fail(`No inline inputs found in ${path.relative(packageDir, inputFile)}`)
  }

  fs.mkdirSync(outDir, { recursive: true })

  const usedNames = new Set(fs.globSync('*.js', { cwd: outDir }))
  const writtenFiles: string[] = []

  for (const fixture of fixtures) {
    const basename = dedupeName(
      `${prefix}${slugify(fixture.testName)}.js`,
      usedNames,
    )
    const targetFile = path.join(outDir, basename)

    if (!force && fs.existsSync(targetFile)) {
      fail(
        `Refusing to overwrite existing fixture: ${path.relative(packageDir, targetFile)}. Re-run with --force to overwrite.`,
      )
    }

    fs.writeFileSync(targetFile, normalizeFixtureSource(fixture.input))
    writtenFiles.push(targetFile)
    usedNames.add(basename)
  }

  for (const file of writtenFiles) {
    console.log(path.relative(packageDir, file))
  }

  console.error(`Extracted ${writtenFiles.length} fixture(s)`)
}

function printHelp(): void {
  console.log(`Usage: extract-hoist-scope-fixtures [options]

Extract \`const input = \\\`...\\\`\` blocks from hoist.test.ts into scope fixtures.

Options:
  -i, --input <file>   Source test file
  -o, --outDir <dir>   Fixture output directory
      --prefix <text>  Prefix for emitted fixture names (default: hoist-)
  -f, --force          Overwrite existing generated fixture files
  -h, --help           Show this help

Examples:
  pnpm extract-hoist-scope-fixtures
  pnpm extract-hoist-scope-fixtures --prefix hoist-case-
`)
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function extractFixtures(
  source: string,
): Array<{ testName: string; input: string }> {
  const fixtures: Array<{ testName: string; input: string }> = []
  const pattern =
    /it\('([^']+)',[\s\S]*?\{\s*const input = `([\s\S]*?)`[\s\S]*?\}\)/g

  for (const match of source.matchAll(pattern)) {
    const [, testName, input] = match
    fixtures.push({ testName, input })
  }

  return fixtures
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function dedupeName(candidate: string, usedNames: Set<string>): string {
  if (!usedNames.has(candidate)) {
    return candidate
  }

  const ext = path.extname(candidate)
  const stem = candidate.slice(0, -ext.length)

  for (let index = 2; ; index++) {
    const nextCandidate = `${stem}-${index}${ext}`
    if (!usedNames.has(nextCandidate)) {
      return nextCandidate
    }
  }
}

function normalizeFixtureSource(input: string): string {
  return input.replace(/^\n/, '').trimEnd() + '\n'
}
