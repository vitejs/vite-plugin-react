import fs from 'node:fs'
import path from 'node:path'
import { parseArgs as parseNodeArgs } from 'node:util'

const scriptDir = path.dirname(new URL(import.meta.url).pathname)
const packageDir = path.resolve(scriptDir, '..')
const fixtureDir = path.join(packageDir, 'src/transforms/fixtures/scope')

main()

function main() {
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

function printHelp() {
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

function fail(message) {
  console.error(message)
  process.exit(1)
}

function collectFixtures(rootDir, filters) {
  return walk(rootDir)
    .filter((file) => file.endsWith('.js'))
    .map((sourceFile) => {
      const relativePath = path.relative(rootDir, sourceFile)
      return {
        sourceFile,
        snapshotFile: sourceFile + '.snap.json',
        relativePath,
        fixtureName: path.basename(sourceFile, '.js'),
      }
    })
    .filter((entry) => matchesFilters(entry, filters))
    .map((entry) => {
      if (!fs.existsSync(entry.snapshotFile)) {
        fail(
          `Missing snapshot for ${entry.relativePath}: ${path.relative(packageDir, entry.snapshotFile)}`,
        )
      }

      const source = fs.readFileSync(entry.sourceFile, 'utf8').trimEnd()
      const snapshot = formatJson(fs.readFileSync(entry.snapshotFile, 'utf8'))
      return { ...entry, source, snapshot }
    })
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath))
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(fullPath))
    } else if (entry.isFile()) {
      files.push(fullPath)
    }
  }
  return files
}

function matchesFilters(entry, filters) {
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

function formatJson(text) {
  return JSON.stringify(JSON.parse(text), null, 2)
}

function renderMarkdown(fixtures, filters) {
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
