import './inner.css'

export function TestNestedRscInner() {
  return <div className="test-nested-rsc-inner">test-nested-rsc-inner</div>
}

// add no-op `import.meta.hot` to trigger `prune` event.
// this is needed until we land https://github.com/vitejs/vite/pull/20768
import.meta.hot
