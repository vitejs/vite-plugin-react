import { revalidateCache } from '../../framework/use-cache-runtime'

export function CachedFunction() {
  return (
    <div data-testid="test-use-cache-fn">
      <form
        action={async (formData) => {
          'use server'
          callCount++
          await cachedFunction(formData.get('argument'))
        }}
      >
        <label>
          Cache key: <input name="argument" defaultValue="alpha" />
        </label>{' '}
        <button>Call cached function</button>
      </form>
      <p>
        Call count: <output data-testid="call-count">{callCount}</output>
        <br />
        Execution count:{' '}
        <output data-testid="execution-count">{executionCount}</output>
      </p>
      <form
        action={async () => {
          'use server'
          revalidateCache(cachedFunction)
        }}
      >
        <button>Clear function cache</button>
      </form>
    </div>
  )
}

let callCount = 0
let executionCount = 0

async function cachedFunction(..._args: unknown[]) {
  'use cache'
  executionCount++
}
