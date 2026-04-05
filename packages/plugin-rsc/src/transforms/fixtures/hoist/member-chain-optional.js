function outer() {
  const x = {}
  async function action() {
    'use server'
    return x?.y.z
  }
}

function outer2() {
  const a = {}
  async function action() {
    'use server'
    return a.b?.c
  }
}
