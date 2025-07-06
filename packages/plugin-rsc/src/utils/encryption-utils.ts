// based on
// https://github.com/vercel/next.js/blob/a0993d90c280690e83a2a1bc7c292e1187429fe8/packages/next/src/server/app-render/encryption-utils.ts

function arrayBufferToString(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  if (len < 65535) {
    return String.fromCharCode.apply(null, bytes as unknown as number[])
  }
  let binary = ''
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return binary
}

function stringToUint8Array(binary: string): Uint8Array {
  const len = binary.length
  const arr = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    arr[i] = binary.charCodeAt(i)
  }
  return arr
}

function concatArray(chunks: Uint8Array[]): Uint8Array {
  let total = 0
  for (const chunk of chunks) {
    total += chunk.length
  }
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

export async function concatArrayStream(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = []
  await stream.pipeTo(
    new WritableStream({
      write(chunk) {
        chunks.push(chunk)
      },
    }),
  )
  return concatArray(chunks)
}

export function arrayToStream(data: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(data)
      controller.close()
    },
  })
}

export function toBase64(buffer: Uint8Array): string {
  return btoa(arrayBufferToString(buffer))
}

export function fromBase64(data: string): Uint8Array {
  return stringToUint8Array(atob(data))
}

export async function generateEncryptionKey(): Promise<Uint8Array> {
  const key = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt'],
  )
  const exported = await crypto.subtle.exportKey('raw', key)
  return new Uint8Array(exported)
}

export async function encryptBuffer(
  data: BufferSource,
  key: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(16))
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data,
  )
  return toBase64(concatArray([iv, new Uint8Array(encrypted)]))
}

export async function decryptBuffer(
  encryptedString: string,
  key: CryptoKey,
): Promise<ArrayBuffer> {
  const concatenated = fromBase64(encryptedString)
  const iv = concatenated.slice(0, 16)
  const encrypted = concatenated.slice(16)
  return crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encrypted,
  )
}
