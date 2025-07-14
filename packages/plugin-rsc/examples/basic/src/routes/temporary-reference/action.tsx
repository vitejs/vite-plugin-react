'use server'

export async function action(node: React.ReactNode) {
  'use server'
  return (
    <span>
      [server <span>{node}</span>]
    </span>
  )
}
