'use custom-server'

import 'server-only'

export async function incrementFromClient(previous: number) {
  return previous + 1
}
