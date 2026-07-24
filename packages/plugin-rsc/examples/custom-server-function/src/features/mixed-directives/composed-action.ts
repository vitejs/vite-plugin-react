'use server'

let composedCount = 0

export async function getComposedCount() {
  return composedCount
}

export async function incrementComposed() {
  'use custom-server'
  composedCount++
}

export async function resetComposedCount() {
  composedCount = 0
}
