import fs from 'node:fs'
import path from 'node:path'
import { parseArgs as parseNodeArgs } from 'node:util'

type Fixture = {
  sourceFile: string
  snapshotFile: string
  relativePath: string
  fixtureName: string
  source: string
  snapshot: string
}

type FixtureEntry = Omit<Fixture, 'source' | 'snapshot'>

const scriptDir = path.dirname(new URL(import.meta.url).pathname)
const packageDir = path.resolve(scriptDir, '..')
const fixtureDir = path.join(packageDir, 'src/transforms/fixtures/scope')

main()

function main(): void {
  const { values, positionals } = parseNodeArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      output: {
        type: 'string',
        short: 'o',
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

  const filters = positionals
  const output = values.output
  const fixtures = collectFixtures(fixtureDir, filters)

  if (fixtures.length === 0) {
    const detail =
      filters.length === 0
        ? 'No fixtures found.'
        : `No fixtures matched: ${filters.join(', ')}`
    console.error(detail)
    process.exit(1)
  }

  const markdown = renderMarkdown(fixtures, filters)

  if (output) {
    fs.writeFileSync(output, markdown)
    console.error(`Wrote ${fixtures.length} fixture review(s) to ${output}`)
  } else {
    process.stdout.write(markdown)
  }
}

function printHelp(): void {
  console.log(`Usage: review-scope-fixtures [filters...] [options]

Build a Markdown review packet for scope fixtures.

Positional arguments:
  filters             Substring filters matched against relative path or basename

Options:
  -o, --output <file> Write to a specific file
  -h, --help          Show this help

Examples:
  pnpm review:scope-fixtures | code -
  pnpm review:scope-fixtures shadowing import | code -
  pnpm review:scope-fixtures var-hoisting --output /tmp/scope-review.md
`)
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function collectFixtures(rootDir: string, filters: string[]): Fixture[] {
  return fs
    .globSync('*.js', { cwd: rootDir })
    .map((relativePath): FixtureEntry => {
      const sourceFile = path.join(rootDir, relativePath)
      return {
        sourceFile,
        snapshotFile: sourceFile + '.snap.json',
        relativePath,
        fixtureName: path.basename(sourceFile, '.js'),
      }
    })
    .filter((entry) => matchesFilters(entry, filters))
    .map((entry): Fixture => {
      if (!fs.existsSync(entry.snapshotFile)) {
        fail(
          `Missing snapshot for ${entry.relativePath}: ${path.relative(packageDir, entry.snapshotFile)}`,
        )
      }

      const source = fs.readFileSync(entry.sourceFile, 'utf8').trimEnd()
      const snapshot = fs.readFileSync(entry.snapshotFile, 'utf8')
      return { ...entry, source, snapshot }
    })
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath))
}

function matchesFilters(entry: FixtureEntry, filters: string[]): boolean {
  if (filters.length === 0) {
    return true
  }
  const haystacks = [entry.relativePath, entry.fixtureName].map((text) =>
    text.toLowerCase(),
  )
  return filters.some((filter) => {
    const needle = filter.toLowerCase()
    return haystacks.some((text) => text.includes(needle))
  })
}

function renderMarkdown(fixtures: Fixture[], filters: string[]): string {
  const lines = [
    '# Scope Fixture Review',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Fixtures: ${fixtures.length}`,
  ]

  if (filters.length > 0) {
    lines.push(`Filters: ${filters.join(', ')}`)
  }

  lines.push('', '## Contents', '')

  for (const fixture of fixtures) {
    lines.push(`- \`${fixture.relativePath}\``)
  }

  for (const fixture of fixtures) {
    lines.push(
      '',
      `## ${fixture.relativePath}`,
      '',
      `Source: \`${path.relative(packageDir, fixture.sourceFile)}\``,
      '',
      '```js',
      fixture.source,
      '```',
      '',
      `Snapshot: \`${path.relative(packageDir, fixture.snapshotFile)}\``,
      '',
      '```json',
      fixture.snapshot,
      '```',
    )
  }

  lines.push('')
  return lines.join('\n')
}
