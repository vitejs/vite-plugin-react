'use client'

import { useState } from 'react'
import { cachedWithoutArguments } from './action'

export function FileDirectiveExtraArguments(props: {
  executionCount: number
  resetAction: () => Promise<void>
  result: string
}) {
  const [submissions, setSubmissions] = useState(0)

  return (
    <>
      <form
        action={cachedWithoutArguments}
        data-testid="file-directive-extra-arguments"
        onSubmit={() => setSubmissions((value) => value + 1)}
      >
        <p>
          <label>
            Ignored argument: <input name="argument" defaultValue="alpha" />
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
