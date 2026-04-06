function outer() {
  const value = 0
  async function action() {
    'use server'
    if (true) {
      return value
    }
  }
}
