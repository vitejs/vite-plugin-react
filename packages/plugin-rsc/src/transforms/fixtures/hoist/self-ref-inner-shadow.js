function Parent() {
  const count = 0

  async function recurse(n) {
    'use server'
    const result = (function recurse(m) {
      return m > 0 ? recurse(m - 1) : 0
    })(n)
    return count + result
  }

  return recurse
}
