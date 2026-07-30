export function ServerComponentError({ url }: { url: URL }) {
  if (url.searchParams.has('throw')) {
    throw new Error('server-component-source-map')
  }
  return (
    <section>
      <h2>Server Component error</h2>
      <a href="/server-component-error?throw">Throw Server Component error</a>
    </section>
  )
}
