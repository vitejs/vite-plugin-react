import { Mismatch } from './client'

export function TestHydrationMismatch(props: { url: URL }) {
  const show = props.url.searchParams.has('test-hydration-mismatch')
  return (
    <div>
      <span>test-hydration-mismatch</span>{' '}
      {show ? <a href="?">hide</a> : <a href="?test-hydration-mismatch">show</a>}{' '}
      {show && <Mismatch />}
    </div>
  )
}
