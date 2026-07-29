'use client'

import React from 'react'
import { getSavedAction, setSavedAction } from '../saved-action.ts'
import { actionB } from './action.tsx'

export function ActionB() {
  const [result, setResult] = React.useState('none')
  const savedAction = getSavedAction()
  return (
    <div>
      <button onClick={() => actionB().then(setResult)}>Run action B</button>
      <button onClick={() => setSavedAction('B', actionB)}>
        Save action B
      </button>
      <button
        disabled={!savedAction}
        onClick={() => savedAction?.action().then(setResult)}
      >
        Run saved action
      </button>
      <p>Saved action: {savedAction?.name ?? 'none'}</p>
      <p>Result: {result}</p>
    </div>
  )
}
