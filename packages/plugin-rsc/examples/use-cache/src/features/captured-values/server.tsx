export function CapturedValues() {
  return (
    <div data-testid="test-use-cache-closure">
      <form
        action={async (formData) => {
          'use server'
          callCount++
          const captured = String(formData.get('outer'))
          const argument = String(formData.get('inner'))
          await createCachedFunction(captured)(argument)
        }}
      >
        <label>
          Captured value: <input name="outer" defaultValue="x" />
        </label>{' '}
        <label>
          Function argument: <input name="inner" defaultValue="y" />
        </label>{' '}
        <button>Call cached function</button>
      </form>
      <p>
        Call count: <output data-testid="call-count">{callCount}</output>
        <br />
        Execution count:{' '}
        <output data-testid="execution-count">{executionCount}</output>
      </p>
    </div>
  )
}

function createCachedFunction(captured: string) {
  async function cachedFunction(argument: string) {
    'use cache'
    executionCount++
    console.log({ captured, argument })
  }
  return cachedFunction
}

let callCount = 0
let executionCount = 0
