'use cache'

let implementationCalls = 0

export async function cachedFromClient(argument: string) {
  implementationCalls++
  return `client:${argument}:${implementationCalls}`
}
