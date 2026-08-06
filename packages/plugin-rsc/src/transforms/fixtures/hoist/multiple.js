let count = 0

function Counter() {
  const name = 'value'

  async function changeCount(formData) {
    'use server'
    count += Number(formData.get(name))
  }

  async function changeCount2(formData) {
    'use server'
    count += Number(formData.get(name))
  }

  return 'something'
}
