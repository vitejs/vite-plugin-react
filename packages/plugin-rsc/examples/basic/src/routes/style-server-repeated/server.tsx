import { TestStyleServerRepeatedItem } from './item'

// render the same css-importing server component multiple times
// e.g. ?test-style-server-repeated=3
export function TestStyleServerRepeated(props: { url: URL }) {
  const count = Number(
    props.url.searchParams.get('test-style-server-repeated') ?? 0,
  )
  return (
    <div style={{ display: 'flex' }}>
      {Array.from({ length: count }, (_, i) => (
        <TestStyleServerRepeatedItem key={i} index={i} />
      ))}
    </div>
  )
}
