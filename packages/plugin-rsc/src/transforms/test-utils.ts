import type MagicString from 'magic-string'

type SourceMapFixtureOutput = {
  name: string
  output: MagicString
  references?: readonly string[]
}

type TransformFixtureOutput = {
  name: string
  output?: MagicString
  references?: readonly string[]
}

export function formatTransformMarkdownFixture(
  input: string,
  outputs: readonly TransformFixtureOutput[],
): string {
  const sections = []
  sections.push(`\
## Input

${formatCodeBlock('js', input)}`)
  for (const { name, output, references } of outputs) {
    const status = output
      ? output.hasChanged()
        ? 'transformed'
        : 'unchanged'
      : 'skipped'
    sections.push(`\
## ${name}

**Status:** ${status}

**References:** ${references?.join(', ') || '(none)'}

${formatCodeBlock('js', output?.toString() ?? input)}`)
  }
  return sections.join('\n\n') + '\n'
}

export function formatSourceMapMarkdownFixture(
  input: string,
  outputs: readonly SourceMapFixtureOutput[],
): string {
  const sections = []
  sections.push(`\
## Input

${formatCodeBlock('js', input)}`)
  for (const { name, output, references } of outputs) {
    const code = output.toString()
    const map = output.generateMap({ includeContent: true, hires: 'boundary' })
    const visualization = generateVisualizationLink(code, map.toString())
    sections.push(`\
## ${name}

**Status:** ${output.hasChanged() ? 'transformed' : 'unchanged'}

**References:** ${references?.join(', ') || '(none)'}

[Source map visualization](${visualization})

${formatCodeBlock('js', code)}`)
  }
  return sections.join('\n\n') + '\n'
}

export function formatDecodedSourceMapMarkdown(
  outputs: readonly SourceMapFixtureOutput[],
): string {
  return (
    outputs
      .map(
        ({ name, output }) =>
          `\
## ${name}

${formatCodeBlock('txt', formatDecodedSourceMap(output))}`,
      )
      .join('\n\n') + '\n'
  )
}

/**
 * Formats decoded mapping ranges as compact original-to-generated text pairs.
 * This test-local formatter is inspired by Oxc's source map visualizer output:
 * https://github.com/oxc-project/oxc-sourcemap/blob/main/src/sourcemap_visualizer.rs
 */
function formatDecodedSourceMap(output: MagicString): string {
  const generatedLines = output.toString().split('\n')
  const map = output.generateDecodedMap({
    includeContent: true,
    hires: 'boundary',
  })
  const sourceLines =
    map.sourcesContent?.map((source) => source.split('\n')) ?? []
  const mappings: string[] = []

  for (const generatedLine of generatedLines.keys()) {
    const segments = map.mappings[generatedLine] ?? []
    if (segments.length === 0) {
      const generatedText = sliceLine(generatedLines, generatedLine, 0)
      // Blank generated lines add noise without describing a mapping boundary.
      if (generatedText.trim()) {
        mappings.push(
          `[unmapped] --> (${generatedLine}:0) ${JSON.stringify(generatedText)}`,
        )
      }
      continue
    }

    if (segments[0]![0] > 0) {
      const generatedText = sliceLine(
        generatedLines,
        generatedLine,
        0,
        segments[0]![0],
      )
      mappings.push(
        `[unmapped] --> (${generatedLine}:0) ${JSON.stringify(generatedText)}`,
      )
    }

    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index]!
      const generatedColumn = segment[0]
      let endIndex = index
      if (segment.length !== 1) {
        const [, sourceIndex, originalLine, originalColumn] = segment
        const offset = generatedColumn - originalColumn
        // Collapse adjacent boundaries when their source and generated columns
        // advance together, while preserving boundaries introduced by edits.
        while (endIndex + 1 < segments.length) {
          const next = segments[endIndex + 1]!
          if (
            next.length === 1 ||
            next[1] !== sourceIndex ||
            next[2] !== originalLine ||
            next[0] - next[3] !== offset
          ) {
            break
          }
          endIndex++
        }
      }

      const next = segments[endIndex + 1]
      const generatedText = sliceLine(
        generatedLines,
        generatedLine,
        generatedColumn,
        next?.[0],
      )
      const generated = `(${generatedLine}:${generatedColumn}) ${JSON.stringify(generatedText)}`

      if (segment.length === 1) {
        mappings.push(`[unmapped] --> ${generated}`)
        continue
      }

      const [, sourceIndex, originalLine, originalColumn] = segment
      const nextOriginalColumn =
        next?.length !== 1 &&
        next?.[1] === sourceIndex &&
        next?.[2] === originalLine &&
        next[3] > originalColumn
          ? next[3]
          : undefined
      const originalText = sliceLine(
        sourceLines[sourceIndex] ?? [],
        originalLine,
        originalColumn,
        nextOriginalColumn,
      )
      mappings.push(
        `(${originalLine}:${originalColumn}) ${JSON.stringify(originalText)} --> ${generated}`,
      )
      index = endIndex
    }
  }

  return mappings.join('\n') + '\n'
}

function sliceLine(
  lines: string[],
  line: number,
  start: number,
  end?: number,
): string {
  const value = lines[line] ?? ''
  const result = value.slice(start, end)
  return end === undefined && line < lines.length - 1 ? result + '\n' : result
}

function formatCodeBlock(language: string, code: string): string {
  return `\`\`\`${language}\n${code}${code.endsWith('\n') ? '' : '\n'}\`\`\``
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
