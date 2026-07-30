'use client'

import { useState } from 'react'

export function InlineDirectiveClient(props: {
  action: (formData: FormData) => Promise<void>
  executionCount: number
  resetAction: () => Promise<void>
  result: string
}) {
  const [submissions, setSubmissions] = useState(0)

  return (
    <>
      <form
        action={props.action}
        data-testid="inline-directive"
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
