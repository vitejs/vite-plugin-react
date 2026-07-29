'use client'

import React from 'react'
import { getSavedAction, setSavedAction } from '../saved-action.ts'
import { commands } from './commands.tsx'

export function ActionA() {
  const [result, setResult] = React.useState('none')
  const savedAction = getSavedAction()
  return (
    <div>
      <button onClick={() => commands.actionA().then(setResult)}>
        Run action A
      </button>
      <button onClick={() => setSavedAction('A', commands.actionA)}>
        Save action A
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
