import * as React from 'react'
import { jsx as _jsx } from 'react/jsx-runtime'
// Both of these are equivalent:
const x = _jsx(Foo, { 'a:b': 'hello' })
const y = _jsx(Foo, { 'a:b': 'hello' })
function Foo(props) {
  return _jsx('div', { children: props['a:b'] })
}
