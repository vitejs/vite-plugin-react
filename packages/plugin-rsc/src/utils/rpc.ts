import {
  decode,
  encode,
  type DecodeOptions,
  type DecodePlugin,
  type EncodeOptions,
  type EncodePlugin,
} from 'turbo-stream'

type RequestPayload = {
  method: string
  args: any[]
}

type ResponsePayload = {
  ok: boolean
  data: any
}

export function createRpcServer<T extends object>(handlers: T) {
  return async (request: Request): Promise<Response> => {
    if (!request.body) {
      throw new Error(`loadModuleDevProxy error: missing request body`)
    }
    const reqPayload = await decode<RequestPayload>(
      request.body.pipeThrough(new TextDecoderStream()),
      decodeOptions,
    )
    const handler = (handlers as any)[reqPayload.method]
    if (!handler) {
      throw new Error(
        `loadModuleDevProxy error: unknown method ${reqPayload.method}`,
      )
    }
    const resPayload: ResponsePayload = { ok: true, data: undefined }
    try {
      resPayload.data = await handler(...reqPayload.args)
    } catch (e) {
      resPayload.ok = false
      resPayload.data = e
    }
    return new Response(encode(resPayload, encodeOptions))
  }
}

export function createRpcClient<T>(options: { endpoint: string }): T {
  async function callRpc(method: string, args: any[]) {
    const reqPayload: RequestPayload = {
      method,
      args,
    }
    const body = encode(reqPayload, encodeOptions).pipeThrough(
      new TextEncoderStream(),
    )
    const res = await fetch(options.endpoint, {
      method: 'POST',
      body,
      // @ts-ignore undici compat
      duplex: 'half',
    })
    if (!res.ok || !res.body) {
      throw new Error(
        `loadModuleDevProxy error: ${res.status} ${res.statusText}`,
      )
    }
    const resPayload = await decode<ResponsePayload>(
      res.body.pipeThrough(new TextDecoderStream()),
      decodeOptions,
    )
    if (!resPayload.ok) {
      throw resPayload.data
    }
    return resPayload.data
  }

  return new Proxy(
    {},
    {
      get(_target, p, _receiver) {
        if (typeof p !== 'string' || p === 'then') {
          return
        }
        return (...args: any[]) => callRpc(p, args)
      },
    },
  ) as any
}

const encodePlugin: EncodePlugin = (value) => {
  if (value instanceof Response) {
    const data: ConstructorParameters<typeof Response> = [
      value.body,
      {
        status: value.status,
        statusText: value.statusText,
        headers: value.headers,
      },
    ]
    return ['vite-rsc/response', ...data]
  }
  if (value instanceof Headers) {
    const data: ConstructorParameters<typeof Headers> = [[...value]]
    return ['vite-rsc/headers', ...data]
  }
}

const decodePlugin: DecodePlugin = (type, ...data) => {
  if (type === 'vite-rsc/response') {
    const value = new Response(...(data as any))
    return { value }
  }
  if (type === 'vite-rsc/headers') {
    const value = new Headers(...(data as any))
    return { value }
  }
}

const encodeOptions: EncodeOptions = {
  plugins: [encodePlugin],
}

const decodeOptions: DecodeOptions = {
  plugins: [decodePlugin],
}
