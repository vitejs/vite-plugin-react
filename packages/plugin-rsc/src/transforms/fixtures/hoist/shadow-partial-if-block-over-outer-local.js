function outer() {
  const value = 0
  async function action() {
    'use server'
    if (true) {
      const value = 1
      return value
    }
    return value
  }
}
