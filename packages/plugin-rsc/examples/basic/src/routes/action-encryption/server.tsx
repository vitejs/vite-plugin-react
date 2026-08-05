let result = 'not called'

function isValidSecret(value: string) {
  return value.length === 28
}

export function TestServerActionEncryption() {
  const secret = 'server-action-capture-secret'

  return (
    <form
      action={async () => {
        'use server'
        result = isValidSecret(secret) ? 'decoded' : 'invalid'
      }}
    >
      <button>test-server-action-encryption</button>
      <output data-testid="test-server-action-encryption">{result}</output>
    </form>
  )
}
