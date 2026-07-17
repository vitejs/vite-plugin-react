import { testAction } from './action'

export function CachedContent() {
  return (
    <section data-testid="cached-content">
      <h2>Cached content</h2>
      <form action={testAction}>
        <button type="submit" data-testid="invoke-action">
          Invoke action
        </button>
      </form>
    </section>
  )
}
