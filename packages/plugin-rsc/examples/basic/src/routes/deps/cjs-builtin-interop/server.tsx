// @ts-ignore
import * as testDep from '@vitejs/test-dep-cjs-events-extend'

export function TestCjsBuiltinInterop() {
  return (
    <div data-testid="cjs-builtin-interop">
      cjs-builtin-interop: {testDep.test}
    </div>
  )
}
