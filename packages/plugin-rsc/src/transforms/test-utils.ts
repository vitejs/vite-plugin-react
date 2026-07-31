import type MagicString from 'magic-string'

export function formatSourceMapFixture(output: MagicString): string {
  const code = output.toString()
  const map = output.generateMap({ includeContent: true, hires: 'boundary' })
  const visualization = generateVisualizationLink(code, map.toString())
  return `/*
Source map visualization:

${visualization}
*/

${code}`
}

export function formatSourceMapMarkdownFixture(
  input: string,
  outputs: readonly {
    name: string
    output?: MagicString
    error?: string
    references?: readonly string[]
  }[],
): string {
  const sections = [`## Input\n\n${formatJavaScriptBlock(input)}`]
  for (const { name, output, error, references } of outputs) {
    if (error !== undefined) {
      sections.push(
        `## ${name}\n\n**Status:** error\n\n\`\`\`text\n${error}\n\`\`\``,
      )
      continue
    }
    if (!output) throw new Error(`missing output for ${name}`)
    const code = output.toString()
    const map = output.generateMap({ includeContent: true, hires: 'boundary' })
    const visualization = generateVisualizationLink(code, map.toString())
    sections.push(
      `## ${name}\n\n**Status:** ${output.hasChanged() ? 'transformed' : 'unchanged'}\n\n**References:** ${references?.join(', ') || '(none)'}\n\n[Source map visualization](${visualization})\n\n${formatJavaScriptBlock(code)}`,
    )
  }
  return sections.join('\n\n') + '\n'
}

function formatJavaScriptBlock(code: string): string {
  return `\`\`\`js\n${code}${code.endsWith('\n') ? '' : '\n'}\`\`\``
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
