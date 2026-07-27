'custom directive'
import './setup'

const initialized = setup()

async function noCapture() {
  'use server'
}

function Component() {
  const value = 'value'
  async function capture() {
    'use server'
    return value
  }
  return capture
}

export async function exported() {
  'use server'
}
