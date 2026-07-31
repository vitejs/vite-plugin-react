import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { hashString } from '@hiogawa/utils'
import type MagicString from 'magic-string'

export function formatSourceMapFixture(
  input: string,
  output: MagicString,
): string {
  const code = output.toString()
  const map = output.generateMap({ includeContent: true, hires: 'boundary' })
  const visualization = generateVisualizationLink(code, map.toString())
  return `/*
Input:

${input}
Source map visualization:

${visualization}
*/

${code}`
}

function generateVisualizationLink(code: string, map: string): string {
  const codeBuffer = Buffer.from(code)
  const mapBuffer = Buffer.from(map)
  const hash = Buffer.concat([
    Buffer.from(String(codeBuffer.length)),
    Buffer.from([0]),
    codeBuffer,
    Buffer.from(String(mapBuffer.length)),
    Buffer.from([0]),
    mapBuffer,
  ])
  return `https://evanw.github.io/source-map-visualization/#${hash.toString('base64')}`
}

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
