import type MagicString from 'magic-string'

import { hashString } from '@hiogawa/utils'
import { mkdir, writeFile } from 'fs/promises'
import { dirname } from 'path'

export async function debugSourceMap(output: MagicString): Promise<void> {
  // load it directly to https://evanw.github.io/source-map-visualization
  const code = output.toString()
  const map = output.generateMap({ includeContent: true, hires: 'boundary' })
  const filepath = `.debug/sourcemap/${hashString(code)}.js`
  await mkdir(dirname(filepath), { recursive: true })
  await writeFile(filepath, inlineSourceMap(code, map))
}

function inlineSourceMap(code: string, map: unknown) {
  const encoded = Buffer.from(JSON.stringify(map), 'utf-8').toString('base64')
  const sourceMappingURL = 'sourceMappingURL'.slice() // avoid vite-node regex match
  return `${code}\n\n//# ${sourceMappingURL}=data:application/json;charset=utf-8;base64,${encoded}\n`
}
