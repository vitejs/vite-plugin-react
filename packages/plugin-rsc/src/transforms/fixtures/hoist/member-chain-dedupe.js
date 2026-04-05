function outer() {
  const x = {}
  async function action() {
    'use server'
    return [x.y.z, Object.keys(x.y), x.w.v]
  }
}
