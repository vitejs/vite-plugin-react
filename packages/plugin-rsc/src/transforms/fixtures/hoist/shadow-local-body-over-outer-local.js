function outer() {
  const value = 0
  async function action() {
    'use server'
    const value = 0
    return value
  }
}
