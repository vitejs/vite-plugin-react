'use client'

import { atom } from 'jotai/vanilla'
import { Component, createContext, useContext, memo } from 'react'
import { unstable_allowServer as allowServer } from 'waku/client'

const initialCount = 1
const TWO = 2
function double(x) {
  return x * TWO
}
export const countAtom = allowServer(atom(double(initialCount)))

export const Empty = () => null

function Private() {
  return 'Secret'
}
const SecretComponent = () => 'Secret'
const SecretFunction = (n) => 'Secret' + n

export function Greet({ name }) {
  return 'Hello ' + name
}

export class MyComponent extends Component {
  render() {
    return 'Class Component'
  }
}

const MyContext = createContext()

export const useMyContext = () => useContext(MyContext)

const MyProvider = memo(MyContext)

export const NAME = 'World'

export default function App() {
  return 'Hello World'
}
