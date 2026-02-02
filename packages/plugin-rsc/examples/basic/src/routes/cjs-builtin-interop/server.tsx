import { CustomEventEmitter } from '@vitejs/test-dep-cjs-events-extend'

export function TestCjsBuiltinInterop() {
  let result = 'not-working'

  try {
    // console.trace('CjsBuiltinInterop component rendering');
    const emitter = new CustomEventEmitter()
    result = emitter.getTestValue()
  } catch (error) {
    result = 'error: ' + (error as Error).message
  }

  return (
    <div data-testid="cjs-builtin-interop">cjs-builtin-interop: {result}</div>
  )
}
