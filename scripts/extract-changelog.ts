import { readFileSync } from 'node:fs'

function main() {
  const [path, version] = process.argv.slice(2)
  if (!path || !version) {
    throw new Error('Usage: node scripts/extract-changelog.ts <path> <version>')
  }

  const sections = readFileSync(path, 'utf-8').split(/^## /m).slice(1)
  const section = sections.find((section) =>
    section.split('\n', 1)[0].includes(`[${version}](`),
  )
  if (!section) throw new Error(`Missing changelog entry for ${version}`)

  const notes = section.split('\n').slice(1).join('\n').trim()
  if (!notes) throw new Error(`Empty changelog entry for ${version}`)
  process.stdout.write(`${notes}\n`)
}

main()
