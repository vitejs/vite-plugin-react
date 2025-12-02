import { TestClient } from './client'

export function TestCssClientNoSsr(props: { url: URL }) {
  return (
    <div>
      <span>test-client-style-no-ssr</span> <a href="?test-client-style-no-ssr">show</a>{' '}
      <a href="?">hide</a>{' '}
      {props.url.searchParams.has('test-client-style-no-ssr') && <TestClient />}
    </div>
  )
}
