import { decode, encode } from 'turbo-stream'

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
    )
    const handler = (handlers as any)[reqPayload.method]
    if (!handler) {
      throw new Error(`loadModuleDevProxy error: unknown method ${reqPayload.method}`)
    }
    const resPayload: ResponsePayload = { ok: true, data: undefined }
    try {
      resPayload.data = await handler(...reqPayload.args)
    } catch (e) {
      resPayload.ok = false
      resPayload.data = e
    }
    return new Response(encode(resPayload))
  }
}

export function createRpcClient<T>(options: { endpoint: string }): T {
  async function callRpc(method: string, args: any[]) {
    const reqPayload: RequestPayload = {
      method,
      args,
    }
    const body = encode(reqPayload).pipeThrough(new TextEncoderStream())
    const res = await fetch(options.endpoint, {
      method: 'POST',
      body,
      // @ts-ignore undici compat
      duplex: 'half',
    })
    if (!res.ok || !res.body) {
      throw new Error(`loadModuleDevProxy error: ${res.status} ${res.statusText}`)
    }
    const resPayload = await decode<ResponsePayload>(res.body.pipeThrough(new TextDecoderStream()))
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
