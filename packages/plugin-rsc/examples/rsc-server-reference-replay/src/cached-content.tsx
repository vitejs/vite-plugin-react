import { testAction } from './action'

export function CachedContent() {
  return (
    <section>
      <h2>Cached content</h2>
      <form action={testAction}>
        <button type="submit">Invoke action</button>
      </form>
    </section>
  )
}
