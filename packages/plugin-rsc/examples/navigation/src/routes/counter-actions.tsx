'use server'

let serverCounter = 0

export async function incrementServerCounter() {
  serverCounter++
}

export async function getServerCounter() {
  return serverCounter
}
