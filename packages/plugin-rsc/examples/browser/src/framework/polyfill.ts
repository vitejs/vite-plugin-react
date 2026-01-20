// Safari doesn't implement ReadableByteStreamController.
// Only load the polyfill when needed.
// https://github.com/gaearon/rscexplorer/blob/main/src/shared/polyfill.ts
export const polyfillReady: Promise<void> =
  typeof globalThis.ReadableByteStreamController === 'undefined'
    ? import('web-streams-polyfill').then(
        ({ ReadableStream, ReadableByteStreamController }) => {
          globalThis.ReadableStream =
            ReadableStream as typeof globalThis.ReadableStream
          globalThis.ReadableByteStreamController =
            ReadableByteStreamController as typeof globalThis.ReadableByteStreamController
        },
      )
    : Promise.resolve()
