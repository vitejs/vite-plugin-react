function outer(outerDefault) {
  async function action({ x = outerDefault } = {}) {
    'use server'
    return x
  }
}
