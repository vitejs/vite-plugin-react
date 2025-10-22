'use server'

let serverCounter = 0

export async function incrementServerCounter() {
  serverCounter++
}

export function getServerCounter() {
  return serverCounter
}
