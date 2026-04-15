import {
  createFromReadableStream,
  renderToReadableStream,
} from '@vitejs/plugin-rsc/rsc'
import { TestNestedRscInner } from './inner'

// Reproduces the framework pattern (e.g. TanStack Start's
// `createServerFn` + `renderServerComponent`) where a server component
// whose module lives only in the `rsc` environment is rendered through
// a nested Flight stream and embedded back into the outer tree.
export function TestNestedRsc() {
  const stream = renderToReadableStream(<TestNestedRscInner />)
  const deserialized = createFromReadableStream<React.ReactNode>(stream)
  return <div>test-nested-rsc:{deserialized}</div>
}
