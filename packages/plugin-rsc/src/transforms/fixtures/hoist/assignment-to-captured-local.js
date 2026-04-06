// Writing to a captured local only mutates the hoisted action's bound
// parameter copy, not the original outer binding.
function Counter() {
  let local = 0

  async function updateLocal() {
    'use server'
    local = 1
  }

  return 'something'
}
