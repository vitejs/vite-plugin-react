let builtinCount = 0
let customCount = 0

export function getCounts() {
  return { builtinCount, customCount }
}

export async function incrementBuiltin() {
  'use server'
  builtinCount++
}

export async function incrementCustom() {
  'use custom-server'
  customCount++
}
