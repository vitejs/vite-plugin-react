'use client'

import React from 'react'
import { getSavedAction, setSavedAction } from '../saved-action.ts'
import { getActionA } from './action-indirect.ts'

export function ActionA() {
  const [result, setResult] = React.useState('none')
  const savedAction = getSavedAction()
  const actionA = getActionA()
  return (
    <div>
      <button onClick={() => actionA().then(setResult)}>Run action A</button>
      <button onClick={() => setSavedAction(actionA)}>Save action A</button>
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
