// @ts-ignore
import * as ReactServer from 'react-server-dom-webpack/server.edge'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { createServerManifest, setRequireModule } from './rsc'

// stands in for the `virtual:vite-rsc/server-references` map of a build
const serverReferences: Record<string, () => Promise<unknown>> = {
  known: async () => ({ action: () => 'ok' }),
  other: async () => ({}),
}
const load = vi.fn(async (id: string) => {
  const import_ = serverReferences[id]
  if (!import_) {
    throw new Error(`server reference not found '${id}'`)
  }
  return import_()
})

const serverRequire = vi.fn()

beforeAll(() => {
  // as in a build, where manifests add no cache tag, so a memo key is the id itself
  vi.stubEnv('DEV', false)
  setRequireModule({ load })
  // spy on every server require call, i.e. every memo lookup
  const original = (globalThis as any).__vite_rsc_server_require__
  serverRequire.mockImplementation(original)
  ;(globalThis as any).__vite_rsc_server_require__ = serverRequire
  // the plugin rewrites `__webpack_require__` in the vendored React build
  ;(globalThis as any).__webpack_require__ = (id: string) =>
    (globalThis as any).__vite_rsc_require__(id)
})

afterAll(() => {
  vi.unstubAllEnvs()
})

// React's reply decoder unescapes a leading "$$" to "$",
// so a reference id "$$x" goes on the wire as "$$$x".
function decodeReply(id: string) {
  const body = new FormData()
  body.set('1', JSON.stringify({ id, bound: null }))
  body.set('0', JSON.stringify(['$h1']))
  return ReactServer.decodeReply(body, createServerManifest()) as Promise<
    unknown[]
  >
}

// form field names are not unescaped
async function decodeAction(id: string) {
  const body = new FormData()
  body.set('$ACTION_ID_' + id, '')
  return ReactServer.decodeAction(body, createServerManifest())
}

describe('ids with internal markers are rejected before the memo', () => {
  test.each([
    ['decode-client prefix', '$$$decode-client:x#y'],
    ['preserve prefix', '$$$preserve:x#y'],
    ['server prefix', '$$$server:known#action'],
    ['cache tag on a known id', 'known$$cache=abc#action'],
  ])('decodeReply: %s', async (_, id) => {
    serverRequire.mockClear()
    load.mockClear()
    await expect(decodeReply(id)).rejects.toThrow(/server reference not found/)
    expect(serverRequire).not.toHaveBeenCalled()
    expect(load).not.toHaveBeenCalled()
  })

  test.each([
    ['decode-client prefix', '$$decode-client:x#y'],
    ['preserve prefix', '$$preserve:x#y'],
    ['cache tag on a known id', 'known$$cache=abc#action'],
  ])('decodeAction: %s', async (_, id) => {
    serverRequire.mockClear()
    await expect(decodeAction(id)).rejects.toThrow(/server reference not found/)
    expect(serverRequire).not.toHaveBeenCalled()
  })
})

describe('unknown ids are not kept', () => {
  test('decodeReply', async () => {
    load.mockClear()
    await expect(decodeReply('fake#x')).rejects.toThrow(
      /server reference not found/,
    )
    // a kept entry would return the first rejection without loading again
    await expect(decodeReply('fake#x')).rejects.toThrow(
      /server reference not found/,
    )
    expect(load).toHaveBeenCalledTimes(2)
  })

  test('decodeAction', async () => {
    load.mockClear()
    await expect(decodeAction('fake#x')).rejects.toThrow(
      /server reference not found/,
    )
    await expect(decodeAction('fake#x')).rejects.toThrow(
      /server reference not found/,
    )
    expect(load).toHaveBeenCalledTimes(2)
  })
})

test('known id', async () => {
  const [action] = await decodeReply('known#action')
  expect(typeof action).toBe('function')
  expect(await (action as Function)()).toBe('ok')
  const formAction = await decodeAction('known#action')
  expect(await (formAction as Function)()).toBe('ok')
})

describe('server require memo', () => {
  const serverRequire = (id: string): Promise<unknown> =>
    (globalThis as any).__vite_rsc_server_require__(id)

  test('keeps fulfilled loads', async () => {
    load.mockClear()
    const first = serverRequire('other')
    expect(serverRequire('other')).toBe(first)
    await first
    expect(serverRequire('other')).toBe(first)
    expect(load).toHaveBeenCalledTimes(1)
  })

  test('drops rejected loads', async () => {
    load.mockClear()
    const first = serverRequire('missing')
    // stable while pending
    expect(serverRequire('missing')).toBe(first)
    await expect(first).rejects.toThrow(/server reference not found/)
    const second = serverRequire('missing')
    expect(second).not.toBe(first)
    await expect(second).rejects.toThrow(/server reference not found/)
    expect(load).toHaveBeenCalledTimes(2)
  })
})
