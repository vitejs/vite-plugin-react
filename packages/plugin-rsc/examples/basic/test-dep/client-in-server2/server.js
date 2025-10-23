import { TestContextProvider } from './client.js'
import React from 'react'

export function TestContextProviderInServer(props) {
  return React.createElement(
    TestContextProvider,
    { value: props.value },
    props.children,
  )
}
