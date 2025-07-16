import { describe, expect, test } from 'vitest'

/**
 * Check if a CSS import ID has special queries that should be excluded from CSS collection.
 * These queries transform CSS imports to return different data types rather than actual CSS to be linked.
 */
function hasSpecialCssQuery(id: string): boolean {
  try {
    const url = new URL(id, 'file://')
    return (
      url.searchParams.has('url') ||
      url.searchParams.has('inline') ||
      url.searchParams.has('raw')
    )
  } catch {
    // If URL parsing fails, check with simple string matching as fallback
    return id.includes('?url') || id.includes('?inline') || id.includes('?raw')
  }
}

describe('hasSpecialCssQuery', () => {
  test('should return true for CSS imports with ?url query', () => {
    expect(hasSpecialCssQuery('/path/to/style.css?url')).toBe(true)
    expect(hasSpecialCssQuery('/path/to/style.css?url&other=param')).toBe(true)
    expect(hasSpecialCssQuery('/path/to/style.css?other=param&url')).toBe(true)
  })

  test('should return true for CSS imports with ?inline query', () => {
    expect(hasSpecialCssQuery('/path/to/style.css?inline')).toBe(true)
    expect(hasSpecialCssQuery('/path/to/style.css?inline&other=param')).toBe(
      true,
    )
    expect(hasSpecialCssQuery('/path/to/style.css?other=param&inline')).toBe(
      true,
    )
  })

  test('should return true for CSS imports with ?raw query', () => {
    expect(hasSpecialCssQuery('/path/to/style.css?raw')).toBe(true)
    expect(hasSpecialCssQuery('/path/to/style.css?raw&other=param')).toBe(true)
    expect(hasSpecialCssQuery('/path/to/style.css?other=param&raw')).toBe(true)
  })

  test('should return false for normal CSS imports', () => {
    expect(hasSpecialCssQuery('/path/to/style.css')).toBe(false)
    expect(hasSpecialCssQuery('/path/to/style.css?t=123456')).toBe(false)
    expect(hasSpecialCssQuery('/path/to/style.css?other=param')).toBe(false)
  })

  test('should handle complex URLs with multiple parameters', () => {
    expect(hasSpecialCssQuery('/path/to/style.css?t=123&url&v=1')).toBe(true)
    expect(hasSpecialCssQuery('/path/to/style.css?t=123&inline&v=1')).toBe(true)
    expect(hasSpecialCssQuery('/path/to/style.css?t=123&raw&v=1')).toBe(true)
    expect(hasSpecialCssQuery('/path/to/style.css?t=123&other=param&v=1')).toBe(
      false,
    )
  })

  test('should handle absolute URLs', () => {
    expect(hasSpecialCssQuery('http://localhost:3000/style.css?url')).toBe(true)
    expect(hasSpecialCssQuery('http://localhost:3000/style.css?inline')).toBe(
      true,
    )
    expect(hasSpecialCssQuery('http://localhost:3000/style.css?raw')).toBe(true)
    expect(hasSpecialCssQuery('http://localhost:3000/style.css?t=123')).toBe(
      false,
    )
  })

  test('should handle file URLs', () => {
    expect(hasSpecialCssQuery('file:///path/to/style.css?url')).toBe(true)
    expect(hasSpecialCssQuery('file:///path/to/style.css?inline')).toBe(true)
    expect(hasSpecialCssQuery('file:///path/to/style.css?raw')).toBe(true)
    expect(hasSpecialCssQuery('file:///path/to/style.css?t=123')).toBe(false)
  })
})
