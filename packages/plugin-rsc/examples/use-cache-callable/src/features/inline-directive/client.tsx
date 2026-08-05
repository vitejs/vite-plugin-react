'use client'

import { useState } from 'react'

export function InlineDirectiveClient(props: {
  action: (formData: FormData) => Promise<void>
  capture: string
  executionCount: number
  resetAction: () => Promise<void>
  result: string
  selectCaptureAction: (formData: FormData) => Promise<void>
}) {
  const [submissions, setSubmissions] = useState(0)

  return (
    <>
      <form action={props.selectCaptureAction}>
        <button name="capture" value="first">
          First capture
        </button>{' '}
        <button name="capture" value="second">
          Second capture
        </button>
        <p>
          Selected capture:{' '}
          <output data-testid="capture">{props.capture}</output>
        </p>
      </form>
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
