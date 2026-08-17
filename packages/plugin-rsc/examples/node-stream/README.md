# Node.js streams

This example uses the same application as [`examples/starter`](../starter), but its framework layer keeps rendering on native Node.js streams from the incoming request through the outgoing response:

```text
IncomingMessage
  -> RSC renderToPipeableStream
  -> PassThrough branches
  -> SSR createFromNodeStream
  -> React DOM renderToPipeableStream
  -> RSC payload injection Transform
  -> ServerResponse
```

[`vite.config.ts`](./vite.config.ts) sets `serverHandler: false` and installs the handler in both `configureServer` and `configurePreviewServer`. During development, the plugin imports the RSC entry through Vite's RSC environment runner so that server HMR remains active. Preview imports the built RSC entry directly.

[`rsc-html-stream.server.node.ts`](./src/framework/rsc-html-stream.server.node.ts) is the Node.js stream counterpart of `rsc-html-stream/server`. The browser entry continues using `rsc-html-stream/client`, because browser fetch and hydration use Web streams.
