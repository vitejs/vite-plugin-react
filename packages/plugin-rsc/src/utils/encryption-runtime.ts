import encryptionKeySource from 'virtual:vite-rsc/encryption-key'
import { renderToReadableStream } from '../react/rsc/server'
import {
  arrayToStream,
  concatArrayStream,
  decryptBuffer,
  encryptBuffer,
  fromBase64,
} from './encryption-utils'
import { once } from './shared'

// based on
// https://github.com/parcel-bundler/parcel/blob/9855f558a69edde843b1464f39a6010f6b421efe/packages/transformers/js/src/rsc-utils.js
// https://github.com/vercel/next.js/blob/c10c10daf9e95346c31c24dc49d6b7cda48b5bc8/packages/next/src/server/app-render/encryption.ts
// https://github.com/vercel/next.js/pull/56377

// With an `actionId`, it is authenticated as AES-GCM additional data, so the
// ciphertext only decrypts for that action. A closure issued for one action
// can't stand in for another's.
export async function encryptActionBoundArgs(
  originalValue: unknown,
  actionId?: string,
): Promise<string> {
  const serialized = renderToReadableStream(originalValue)
  const serializedBuffer = await concatArrayStream(serialized)
  return encryptBuffer(
    serializedBuffer as BufferSource,
    await getEncryptionKey(),
    actionIdData(actionId),
  )
}

export async function decryptActionBoundArgs(
  encrypted: ReturnType<typeof encryptActionBoundArgs>,
  actionId?: string,
): Promise<unknown> {
  const [{ createFromReadableStream }, serializedBuffer] = await Promise.all([
    import('../react/rsc/client'),
    decryptBuffer(
      await encrypted,
      await getEncryptionKey(),
      actionIdData(actionId),
    ),
  ])
  const serialized = arrayToStream(new Uint8Array(serializedBuffer))
  return createFromReadableStream(serialized)
}

function actionIdData(actionId: string | undefined) {
  return actionId === undefined ? undefined : new TextEncoder().encode(actionId)
}

const getEncryptionKey = /* #__PURE__ */ once(async () => {
  const resolved = await encryptionKeySource()
  const key = await crypto.subtle.importKey(
    'raw',
    fromBase64(resolved) as BufferSource,
    {
      name: 'AES-GCM',
    },
    true,
    ['encrypt', 'decrypt'],
  )
  return key
})
