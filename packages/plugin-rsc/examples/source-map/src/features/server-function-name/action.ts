'use server'

export async function moduleFunctionName() {
  return new Error().stack?.split('\n')[1] ?? ''
}
