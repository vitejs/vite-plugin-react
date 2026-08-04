'use server'

export function recursive(depth) {
  if (depth > 0) return recursive(depth - 1)
  return recursive.marker
}
