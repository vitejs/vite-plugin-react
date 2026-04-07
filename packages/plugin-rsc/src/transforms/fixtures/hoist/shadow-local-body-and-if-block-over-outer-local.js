function outer() {
  const value = 0
  async function action() {
    'use server'
    if (true) {
      const value = 0
      return value
    }
    const value = 0
    return value
  }
}
