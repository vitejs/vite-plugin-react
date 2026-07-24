'use custom-server'

// @ts-ignore -- virtualized by @vitejs/plugin-rsc
import 'server-only'

export async function incrementFromClient(previous: number) {
  return previous + 1
}
