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
      <button onClick={() => setSavedAction(commands.actionA)}>
        Save action A
      </button>
      <button
        disabled={!savedAction}
        onClick={() => savedAction?.().then(setResult)}
      >
        Run saved action
      </button>
      <p>Result: {result}</p>
    </div>
  )
}
