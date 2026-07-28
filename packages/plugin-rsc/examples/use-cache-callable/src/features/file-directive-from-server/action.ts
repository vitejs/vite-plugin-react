'use cache'

let implementationCalls = 0

export async function cachedFromServer(argument: string) {
  implementationCalls++
  return `server:${argument}:${implementationCalls}`
}
