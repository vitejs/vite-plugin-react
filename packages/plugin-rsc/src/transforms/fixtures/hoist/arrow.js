let count = 0

function Counter() {
  const name = 'value'

  return {
    type: 'form',
    action: (formData) => {
      'use server'
      count += Number(formData.get(name))
    },
  }
}
