import {
  decode,
  encode,
  type DecodePlugin,
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

const decodePlugins: DecodePlugin[] = [
  (type, ...rest) => {
    switch (type) {
      case 'Request': {
        const [method, url, headers, body] = rest as [
          string,
          string,
          [string, string][],
          null | ReadableStream<Uint8Array>,
        ]
        return {
          value: new Request(url, {
            body,
            headers,
            method,
            // @ts-ignore undici compat
            duplex: body ? 'half' : undefined,
          }),
        }
      }
      case 'Response': {
        const [status, statusText, headers, body] = rest as [
          number,
          string,
          [string, string][],
          null | ReadableStream<Uint8Array>,
        ]
        return {
          value: new Response(body, {
            headers,
            status,
            statusText,
          }),
        }
      }
    }
    return false
  },
]

const encodePlugins: EncodePlugin[] = [
  (obj) => {
    if (obj instanceof Request) {
      return ['Request', obj.method, obj.url, Array.from(obj.headers), obj.body]
    }
    if (obj instanceof Response) {
      return [
        'Response',
        obj.status,
        obj.statusText,
        Array.from(obj.headers),
        obj.body,
      ]
    }
    return false
  },
]

export function createRpcServer<T extends object>(handlers: T) {
  return async (request: Request): Promise<Response> => {
    if (!request.body) {
      throw new Error(`loadModuleDevProxy error: missing request body`)
    }
    const reqPayload = await decode<RequestPayload>(
      request.body.pipeThrough(new TextDecoderStream()),
      {
        plugins: decodePlugins,
      },
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
    return new Response(
      encode(resPayload, {
        plugins: encodePlugins,
        redactErrors: false,
      }),
    )
  }
}

export function createRpcClient<T>(options: { endpoint: string }): T {
  async function callRpc(method: string, args: any[]) {
    const reqPayload: RequestPayload = {
      method,
      args,
    }
    const body = encode(reqPayload, {
      plugins: encodePlugins,
      redactErrors: false,
    }).pipeThrough(new TextEncoderStream())
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
      {
        plugins: decodePlugins,
      },
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
