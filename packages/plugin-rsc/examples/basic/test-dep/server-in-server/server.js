import React from 'react'

const h = React.createElement

let counter = 0

export function ServerCounter() {
  return h(
    'form',
    {
      'data-testid': 'server-in-server',
      action: async () => {
        'use server'
        counter++
      },
    },
    h('button', null, `server-in-server: ${counter}`),
  )
}
