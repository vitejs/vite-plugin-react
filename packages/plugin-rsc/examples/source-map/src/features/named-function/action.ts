'use server'

export async function namedFunction() {
  return new Error().stack?.split('\n')[1] ?? ''
}
