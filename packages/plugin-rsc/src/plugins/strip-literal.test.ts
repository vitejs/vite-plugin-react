import { describe, expect, it } from 'vitest'
import { stripLiteral } from 'strip-literal'

describe('stripLiteral for viteRsc API detection', () => {
  it('should strip comments with import.meta.viteRsc.loadModule', () => {
    const code = `
// This is a comment with import.meta.viteRsc.loadModule("test")
/* block comment import.meta.viteRsc.loadModule("test") */
import.meta.viteRsc.loadModule("actual");
`
    const stripped = stripLiteral(code)
    const matches = [
      ...stripped.matchAll(/import\.meta\.viteRsc\.loadModule\(([\s\S]*?)\)/dg),
    ]

    // Should only match the actual call, not the ones in comments
    expect(matches.length).toBe(1)
    // Extract argument using indices from original code
    const [argStart, argEnd] = matches[0]!.indices![1]!
    const argCode = code.slice(argStart, argEnd).trim()
    expect(argCode).toBe('"actual"')
  })

  it('should strip strings with import.meta.viteRsc.loadModule', () => {
    const code = `
const x = "string with import.meta.viteRsc.loadModule('test')";
const y = 'another string import.meta.viteRsc.loadModule("test")';
import.meta.viteRsc.loadModule("actual");
`
    const stripped = stripLiteral(code)
    const matches = [
      ...stripped.matchAll(/import\.meta\.viteRsc\.loadModule\(([\s\S]*?)\)/dg),
    ]

    // Should only match the actual call, not the ones in strings
    expect(matches.length).toBe(1)
    const [argStart, argEnd] = matches[0]!.indices![1]!
    const argCode = code.slice(argStart, argEnd).trim()
    expect(argCode).toBe('"actual"')
  })

  it('should strip comments with import.meta.viteRsc.loadCss', () => {
    const code = `
// This is a comment with import.meta.viteRsc.loadCss("test")
/* block comment import.meta.viteRsc.loadCss("test") */
import.meta.viteRsc.loadCss("actual");
`
    const stripped = stripLiteral(code)
    const matches = [
      ...stripped.matchAll(/import\.meta\.viteRsc\.loadCss\(([\s\S]*?)\)/dg),
    ]

    // Should only match the actual call, not the ones in comments
    expect(matches.length).toBe(1)
    const [argStart, argEnd] = matches[0]!.indices![1]!
    const argCode = code.slice(argStart, argEnd).trim()
    expect(argCode).toBe('"actual"')
  })

  it('should strip strings with import.meta.viteRsc.loadCss', () => {
    const code = `
const x = "string with import.meta.viteRsc.loadCss('test')";
import.meta.viteRsc.loadCss("actual");
`
    const stripped = stripLiteral(code)
    const matches = [
      ...stripped.matchAll(/import\.meta\.viteRsc\.loadCss\(([\s\S]*?)\)/dg),
    ]

    // Should only match the actual call, not the ones in strings
    expect(matches.length).toBe(1)
    const [argStart, argEnd] = matches[0]!.indices![1]!
    const argCode = code.slice(argStart, argEnd).trim()
    expect(argCode).toBe('"actual"')
  })

  it('should strip comments with import.meta.viteRsc.loadBootstrapScriptContent', () => {
    const code = `
// This is a comment with import.meta.viteRsc.loadBootstrapScriptContent("test")
/* block import.meta.viteRsc.loadBootstrapScriptContent("test") */
import.meta.viteRsc.loadBootstrapScriptContent("actual");
`
    const stripped = stripLiteral(code)
    const matches = [
      ...stripped.matchAll(
        /import\s*\.\s*meta\s*\.\s*viteRsc\s*\.\s*loadBootstrapScriptContent\(([\s\S]*?)\)/dg,
      ),
    ]

    // Should only match the actual call, not the ones in comments
    expect(matches.length).toBe(1)
    const [argStart, argEnd] = matches[0]!.indices![1]!
    const argCode = code.slice(argStart, argEnd).trim()
    expect(argCode).toBe('"actual"')
  })

  it('should handle mixed comments and strings', () => {
    const code = `
// Comment with import.meta.viteRsc.loadModule("comment")
const x = "string with import.meta.viteRsc.loadModule('string')";
/* 
 * Multi-line comment
 * import.meta.viteRsc.loadModule("multiline")
 */
import.meta.viteRsc.loadModule("first-actual");
const y = \`template with import.meta.viteRsc.loadModule('template')\`;
import.meta.viteRsc.loadModule("second-actual");
`
    const stripped = stripLiteral(code)
    const matches = [
      ...stripped.matchAll(/import\.meta\.viteRsc\.loadModule\(([\s\S]*?)\)/dg),
    ]

    // Should only match the actual calls
    expect(matches.length).toBe(2)

    const [argStart1, argEnd1] = matches[0]!.indices![1]!
    const argCode1 = code.slice(argStart1, argEnd1).trim()
    expect(argCode1).toBe('"first-actual"')

    const [argStart2, argEnd2] = matches[1]!.indices![1]!
    const argCode2 = code.slice(argStart2, argEnd2).trim()
    expect(argCode2).toBe('"second-actual"')
  })
})
