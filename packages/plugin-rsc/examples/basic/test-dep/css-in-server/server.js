import React from 'react'
import './server.css'

const h = React.createElement

export default function TestDepCssInServer() {
  return h('div', { className: 'test-dep-css-in-server' }, `test-dep-css-in-server`)
}
