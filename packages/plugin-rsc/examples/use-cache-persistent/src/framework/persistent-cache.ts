import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const cacheDirectory = path.resolve('.use-cache')

// TODO: Isolate dev runs and production builds in timestamped directories and
// record the active namespace in metadata. A new run or build could then remove
// obsolete directories while restarts of the same emitted build keep its cache.

export async function getPersistentCache(
  key: string,
): Promise<Uint8Array | undefined> {
  try {
    return await readFile(getCachePath(key))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
}

export async function setPersistentCache(key: string, value: Uint8Array) {
  await mkdir(cacheDirectory, { recursive: true })
  const cachePath = getCachePath(key)
  const temporaryPath = `${cachePath}.${randomUUID()}.tmp`
  await writeFile(temporaryPath, value)
  await rename(temporaryPath, cachePath)
}

export async function resetPersistentCache() {
  await rm(cacheDirectory, { recursive: true, force: true })
}

function getCachePath(key: string) {
  const hash = createHash('sha256').update(key).digest('hex')
  return path.join(cacheDirectory, hash)
}
