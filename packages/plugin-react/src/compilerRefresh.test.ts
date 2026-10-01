import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import { expect, test } from 'vitest'
import react from './index'

const workerCode = `
const Factory = { Values: <Value>(values: Value): Value => values }
export enum MessageKind { Ready = 'ready', Complete = 'complete' }
export const MessageKinds = Factory.Values(Object.values(MessageKind))
`

test('native compiler serves non-React TypeScript without refresh registrations', async () => {
  const root = await mkdtemp(join(tmpdir(), 'react-compiler-refresh-'))
  await writeFile(join(root, 'message.ts'), workerCode)
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [react({ compiler: true })],
  })
  try {
    const output = await server.transformRequest('/message.ts')
    expect(output?.code).not.toContain('$RefreshReg$')
    const module = await import(
      `data:text/javascript,${encodeURIComponent(output!.code)}`
    )
    expect(module.MessageKinds).toEqual(['ready', 'complete'])
  } finally {
    await server.close()
    await rm(root, { recursive: true, force: true })
  }
})

test.each([
  [
    'component.tsx?query',
    'export function App() { return <div /> }',
    undefined,
  ],
  [
    'component.ts',
    'import { jsx } from "react/jsx-runtime"; export function App() { return jsx("div", {}) }',
    undefined,
  ],
  [
    'component.ts',
    'import { jsxDEV } from "react/jsx-dev-runtime"; export function App() { return jsxDEV("div", {}) }',
    undefined,
  ],
  [
    'component.ts',
    'import { jsx } from "@emotion/react/jsx-runtime"; export function App() { return jsx("div", {}) }',
    '@emotion/react',
  ],
])(
  'keeps refresh for %s with a JSX runtime',
  async (id, code, jsxImportSource) => {
    const server = await createServer({
      configFile: false,
      logLevel: 'silent',
      plugins: [react({ compiler: true, jsxImportSource })],
    })
    try {
      const plugin = server.config.plugins.find(
        (p) => p.name === 'vite:react-compiler',
      )!
      const hook = plugin.transform!
      const handler = typeof hook === 'function' ? hook : hook.handler
      const output = await handler.call(
        { environment: server.environments.client } as any,
        code,
        `/src/${id}`,
      )
      expect(
        output && typeof output === 'object' ? output.code : output,
      ).toContain('$RefreshReg$')
    } finally {
      await server.close()
    }
  },
)
