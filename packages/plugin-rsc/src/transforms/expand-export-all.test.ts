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
    const result = await transformExpandExportAll(input, ast, {
      importer,
      resolve: async (source, importer) =>
        path.join(path.dirname(importer), source),
      load: async (id) => {
        const code = fs.readFileSync(id, 'utf-8')
        return { code, ast: await parseAstAsync(code) }
      },
    })
    if (!result) {
      return '/* NO CHANGE */'
    }
    await parseAstAsync(result.code)
    return result.code
  }

  for (const [file, mod] of Object.entries(fixtures)) {
    it(path.basename(path.dirname(file)), async () => {
      const input = ((await mod()) as any).default as string
      await expect(
        await transformFixture(input, path.join(import.meta.dirname, file)),
      ).toMatchFileSnapshot(file + '.snap.js')
    })
  }
})
