function outer() {
  const x = {}
  const k = 'y'
  async function action() {
    'use server'
    return x[k].z
  }
}
