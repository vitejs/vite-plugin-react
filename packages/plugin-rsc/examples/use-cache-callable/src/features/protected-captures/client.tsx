'use client'

import { useState } from 'react'

export function ProtectedCapturesClient(props: {
  action: (argument: string) => Promise<void>
  executionCount: number
  resetAction: () => Promise<void>
  result: string
}) {
  const [submissions, setSubmissions] = useState(0)

  return (
    <>
      <form
        action={(formData) => {
          // SSR forms also contain React transport fields such as `$ACTION_REF_0`.
          // Pass only user input so fresh encrypted metadata cannot alter the cache key.
          return props.action(String(formData.get('argument')))
        }}
        data-testid="protected-captures"
        onSubmit={() => setSubmissions((value) => value + 1)}
      >
        <p>
          <label>
            Cache key: <input name="argument" defaultValue="alpha" />
          </label>
        </p>
        <p>
          <button>Call cached function</button>
        </p>
        <p>
          <span>
            Submission count:{' '}
            <output data-testid="submission-count">{submissions}</output>
            <br />
            Execution count:{' '}
            <output data-testid="execution-count">
              {props.executionCount}
            </output>
            <br />
            Result: <output data-testid="result">{props.result}</output>
          </span>
        </p>
      </form>
      <form action={props.resetAction}>
        <button>Reset</button>
      </form>
    </>
  )
}
