import { readFile, writeFile } from 'node:fs/promises'
import {
  createFromReadableStream,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'
import type React from 'react'

export async function writeFlight(
  file: string | URL,
  node: React.ReactNode,
): Promise<void> {
  const stream = renderToReadableStream(node)
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
  await writeFile(file, bytes)
}

// Default replay: decoding a server reference imports its module eagerly.
export async function readFlight(file: string | URL): Promise<React.ReactNode> {
  const bytes = await readFile(file)
  return createFromReadableStream<React.ReactNode>(new Blob([bytes]).stream())
}

// Preserved replay: the reference stays unloaded until it is invoked.
export async function readFlightPreserved(
  file: string | URL,
): Promise<React.ReactNode> {
  const bytes = await readFile(file)
  return createFromReadableStream<React.ReactNode>(
    new Blob([bytes]).stream(),
    {},
    { preserveServerReferences: true },
  )
}
