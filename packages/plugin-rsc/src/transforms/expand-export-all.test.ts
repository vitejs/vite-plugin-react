import fs from 'node:fs'
import path from 'node:path'
import { parseAstAsync } from 'vite'
import { describe, expect, it } from 'vitest'
import { transformExpandExportAll } from './expand-export-all'

describe('fixtures', () => {
  const fixtures = import.meta.glob(
    ['./fixtures/expand-export-all/**/entry.js', '!**/*.snap.*'],
    {
      query: 'raw',
    },
  )
  async function transformFixture(input: string, importer: string) {
    const ast = await parseAstAsync(input)
    const result = await transformExpandExportAll({
      code: input,
      ast,
      importer,
      resolve: async (source, importer) => {
        if (importer.includes('/bad-resolve/')) return
        return path.join(path.dirname(importer), source)
      },
      load: async (id) => {
        if (!fs.existsSync(id)) {
          throw new Error(`failed to load ${JSON.stringify(path.basename(id))}`)
        }
        const code = fs.readFileSync(id, 'utf-8')
        return parseAstAsync(code)
      },
    })
    if (!result) {
      return '/* NO CHANGE */\n'
    }
    try {
      await parseAstAsync(result.code)
    } catch (e) {
      return `\
${result.code}

/* PARSE ERROR

${(e as Error).message}

*/
`
    }
    return result.code
  }

  for (const [file, mod] of Object.entries(fixtures)) {
    it(path.basename(path.dirname(file)), async () => {
      const input = ((await mod()) as any).default as string
      let output: string
      try {
        output = await transformFixture(
          input,
          path.join(import.meta.dirname, file),
        )
      } catch (e) {
        output = `\
/* ERROR

${(e as Error).message}

*/
`
      }
      await expect(output).toMatchFileSnapshot(file + '.snap.js')
    })
  }
})
