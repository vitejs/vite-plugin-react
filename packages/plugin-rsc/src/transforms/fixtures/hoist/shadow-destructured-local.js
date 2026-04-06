function buildAction(config) {
  const cookies = getCookies()

  async function submitAction(formData) {
    'use server'
    const { cookies } = parseForm(formData)
    return doSomething(config, cookies)
  }

  return submitAction
}
