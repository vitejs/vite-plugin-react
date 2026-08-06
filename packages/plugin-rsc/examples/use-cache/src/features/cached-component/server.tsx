export function CachedComponent() {
  // Wrapping children in JSX keeps their value out of the cache key, so React
  // can restore the current value through a temporary reference on each render.
  return (
    <CachedShell>
      <span>{new Date().toISOString()}</span>
    </CachedShell>
  )
}

async function CachedShell(props: { children?: React.ReactNode }) {
  'use cache'
  return (
    <div data-testid="test-use-cache-component">
      <p>
        Cached timestamp:{' '}
        <output data-testid="test-use-cache-component-static">
          {new Date().toISOString()}
        </output>
      </p>
      <p>
        Dynamic child:{' '}
        <output data-testid="test-use-cache-component-dynamic">
          {props.children}
        </output>
      </p>
    </div>
  )
}
