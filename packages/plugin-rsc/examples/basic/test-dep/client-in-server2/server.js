import React from 'react'

import { TestContextProvider } from './client.js'

export function TestContextProviderInServer(props) {
  return React.createElement(
    TestContextProvider,
    { value: props.value },
    props.children,
  )
}
