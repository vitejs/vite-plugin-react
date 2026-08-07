'use client'

import { useActionState, useState } from 'react'

export function FileDirectiveFromServerClient(props: {
  action: (argument: string) => Promise<string>
  executionCount: number
  resetAction: () => Promise<void>
}) {
  const [submissions, setSubmissions] = useState(0)
  // The execution count proves the body was skipped while this result proves a
  // persistent hit after restart also replayed the cached value.
  const [result, action] = useActionState(
    (_previousResult: string, formData: FormData) =>
      props.action(String(formData.get('argument'))),
    'not called',
  )

  return (
    <>
      <form
        action={action}
        data-testid="file-directive-from-server"
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
            Result: <output data-testid="result">{result}</output>
          </span>
        </p>
      </form>
      <form action={props.resetAction}>
        <button>Reset</button>
      </form>
    </>
  )
}
