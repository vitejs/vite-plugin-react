'use server'

async function value() {
  return 'multiple aliases called'
}

export { value as first, value as second }
