'use client'

import React from 'react'

const testContext = React.createContext()

export function TestContextProvider(props) {
  return React.createElement(testContext.Provider, { value: props.value }, props.children)
}

export function TestContextValue() {
  const value = React.useContext(testContext)
  return React.createElement('span', null, String(value))
}
