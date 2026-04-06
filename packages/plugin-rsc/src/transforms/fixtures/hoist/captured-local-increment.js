// Mutating a captured local is local to the hoisted invocation copy.
function Counter() {
  let local = 0

  async function updateLocal() {
    'use server'
    local++
  }

  return 'something'
}
