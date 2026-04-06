function outer() {
  const key = 'value'
  async function action(data) {
    'use server'
    const { [key]: val } = data
    return val
  }
}
