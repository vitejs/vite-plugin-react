export function exactRegex(input: string): RegExp {
  return new RegExp(`^${escapeRegex(input)}$`)
}

const escapeRegexRE = /[-/\\^$*+?.()|[\]{}]/g
function escapeRegex(str: string): string {
  return str.replace(escapeRegexRE, '\\$&')
}
