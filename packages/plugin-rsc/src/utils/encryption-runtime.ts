import encryptionKeySource from 'virtual:vite-rsc/encryption-key'
import { once } from '@hiogawa/utils'
import { createFromReadableStream, renderToReadableStream } from '../react/rsc'
import {
  arrayToStream,
  concatArrayStream,
  decryptBuffer,
  encryptBuffer,
  fromBase64,
} from './encryption-utils'

// based on
// https://github.com/parcel-bundler/parcel/blob/9855f558a69edde843b1464f39a6010f6b421efe/packages/transformers/js/src/rsc-utils.js
// https://github.com/vercel/next.js/blob/c10c10daf9e95346c31c24dc49d6b7cda48b5bc8/packages/next/src/server/app-render/encryption.ts
// https://github.com/vercel/next.js/pull/56377

export async function encryptActionBoundArgs(
  originalValue: unknown,
): Promise<string> {
  const serialized = renderToReadableStream(originalValue)
  const serializedBuffer = await concatArrayStream(serialized)
  return encryptBuffer(serializedBuffer, await getEncryptionKey())
}

export async function decryptActionBoundArgs(
  encrypted: ReturnType<typeof encryptActionBoundArgs>,
): Promise<unknown> {
  const serializedBuffer = await decryptBuffer(
    await encrypted,
    await getEncryptionKey(),
  )
  const serialized = arrayToStream(new Uint8Array(serializedBuffer))
  return createFromReadableStream(serialized)
}

const getEncryptionKey = /* #__PURE__ */ once(async () => {
  const resolved = await encryptionKeySource()
  const key = await crypto.subtle.importKey(
    'raw',
    fromBase64(resolved),
    {
      name: 'AES-GCM',
    },
    true,
    ['encrypt', 'decrypt'],
  )
  return key
})
