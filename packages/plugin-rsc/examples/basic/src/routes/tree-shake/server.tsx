export function TestTreeShakeServer() {
  return (
    <form
      action={async () => {
        'use server'
        console.log('test-tree-shake-server')
      }}
    >
      <button>test-tree-shake-server</button>
    </form>
  )
}

// this should not be exported as server functions
export function __unused_server__() {
  console.log('__unused_client_reference__')
}
