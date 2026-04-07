function buildAction(config) {
  const cookies = getCookies()

  async function submitAction(formData) {
    'use server'
    var cookies = formData.get('value')
    return doSomething(config, cookies)
  }

  return submitAction
}
