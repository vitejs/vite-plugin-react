function outer() {
  const value = 0
  async function action() {
    'use server'
    console.log({ value })
    {
      var value = 1
    }
  }
}
