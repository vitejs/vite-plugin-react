// TODO: recursive action bound to itself causes TDZ (`const recurse = $$register(...).bind(null, recurse, ...)`)
function Parent() {
  const count = 0

  async function recurse(n) {
    'use server'
    const helper = () => recurse(n - 1)
    return count + helper()
  }

  return recurse
}
