function outer() {
  const x = {}
  async function action() {
    'use server'
    return [x.__proto__.y, x.a.__proto__.b]
  }
}
