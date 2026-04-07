function buildAction(cookies) {
  async function submitAction(formData) {
    'use server'
    const cookies = formData.get('value')
    return cookies
  }

  return submitAction
}
