function outer(outerList) {
  async function action() {
    'use server'
    for (const item of outerList) {
      process(item)
    }
  }
}
