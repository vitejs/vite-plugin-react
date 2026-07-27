'use custom-server'

let count = 0

export async function getCount() {
  return count
}

export async function increment() {
  'use server'
  count++
}

export async function reset() {
  count = 0
}
