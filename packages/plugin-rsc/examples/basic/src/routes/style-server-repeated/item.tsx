import './item.css'

export function TestStyleServerRepeatedItem(props: { index: number }) {
  return (
    <div
      className="test-style-server-repeated"
      data-testid={`test-style-server-repeated-${props.index}`}
    >
      test-style-server-repeated-{props.index}
    </div>
  )
}
