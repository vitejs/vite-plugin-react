'use client'

import { useActionState, useState } from 'react'

export function FileDirectiveFromServerClient(props: {
  action: (argument: string) => Promise<string>
  executionCount: number
  resetAction: () => Promise<void>
  result: string
}) {
  const [submissions, setSubmissions] = useState(0)
  // Render the action result because a persistent hit after restart skips the
  // function body, so re-rendering props.result would not verify value replay.
  const [result, action] = useActionState(
    (_previousResult: string, formData: FormData) =>
      props.action(String(formData.get('argument'))),
    props.result,
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
