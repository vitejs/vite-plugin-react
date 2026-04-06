function buildAction(config) {
  const cookies = getCookies()

  async function submitAction(formData) {
    'use server'
    if (condition) {
      var cookies = formData.get('value')
    }
    return doSomething(config, cookies)
  }

  return submitAction
}
