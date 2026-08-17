'use server'

let serverCount = 0

export async function getServerCount() {
  return serverCount
}

export async function incrementServerCount() {
  serverCount++
}
