'use server'

async function innerAction(action, ...args) {
  'use server'
  return await action(...args)
}

function wrapAction(action) {
  return innerAction.bind(null, action)
}

export async function exportedAction() {
  'use server'
  return null
}

export default async () => null
