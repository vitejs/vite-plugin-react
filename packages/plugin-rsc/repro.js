import { injectRscStreamToHtml } from './src/rsc-html-stream/ssr.ts'

async function main() {
  let htmlStream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        new TextEncoder().encode('<html><body>Hello World</body></html>'),
      )
      controller.close()
    },
  })

  let rscStream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('[rsc]'))
      controller.close()
    },
  })

  htmlStream = htmlStream.pipeThrough(injectRscStreamToHtml(rscStream))

  const decoder = new TextDecoder()
  const reader = htmlStream.getReader()
  let result
  result = await reader.read()
  console.log(result)
  console.log({ decoded: decoder.decode(result.value) })
  // await reader.cancel("boom!").catch((e) => {
  //   console.error("[reader.cancel]", e)
  // });
  reader.releaseLock()
  await htmlStream.cancel('boom!').catch((e) => {
    console.error('[htmlStream.cancel]', e)
  })

  // try {
  //   console.log(await reader.cancel("boom!"));
  // } catch (e) {
  //   console.error("Error while canceling the reader:", e);
  // }

  // result = await reader.read();
  // console.log(result, decoder.decode(result.value));
  // result = await reader.read();
  // console.log(result, decoder.decode(result.value));
  // result = await reader.read();
  // console.log(result, decoder.decode(result.value));
  // while (true) {
  //   const result = await reader.read();
  //   if (result.done) {
  //     break;
  //   }
  //   console.log(result);
  //   const decoded = decoder.decode(result.value);
  //   console.log({ decoded });
  // }
  // reader.releaseLock();
  // try {
  //   await reader.cancel("boom");
  // } catch (e) {
  //   console.error("", e);
  // }
}

main()
// node --experimental-strip-types packages/plugin-rsc/repro.js
