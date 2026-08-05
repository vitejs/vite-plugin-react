'use client'

// This represents Waku's output after its DCE retains the dependencies and
// initializers that need to survive proxy generation.
import { atom } from 'jotai/vanilla'

const local = 1
export const countAtom = atom(local)

export const Component = () => {
  throw new Error('not available on the server')
}
