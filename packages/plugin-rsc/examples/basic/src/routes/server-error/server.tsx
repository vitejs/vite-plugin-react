export async function TestServerError(props: { url: URL }) {
  if (props.url.searchParams.has('test-server-error')) {
    throw new Error('test-server-error!')
  }
  return (
    <div>
      <a href="?test-server-error">test-server-error</a>
    </div>
  )
}
