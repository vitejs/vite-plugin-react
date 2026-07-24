'use server'

import { reset as resetCustomServerFile } from './use-custom-server-file.ts'

let count = 0

export async function getCount() {
  return count
}

export async function increment() {
  'use custom-server'
  count++
}

export async function reset() {
  count = 0
  await resetCustomServerFile()
}
