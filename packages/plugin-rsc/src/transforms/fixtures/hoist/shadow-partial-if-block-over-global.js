const value = 0
function outer() {
  async function action() {
    'use server'
    if (true) {
      const value = 1
      return value
    }
    return value
  }
}
