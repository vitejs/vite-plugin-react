let result = 'not called'
const expectedSecret = 'server-action-capture-secret'

function isValidSecret(value: string) {
  return value === expectedSecret
}

export function TestServerActionEncryption() {
  const secret = expectedSecret

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
