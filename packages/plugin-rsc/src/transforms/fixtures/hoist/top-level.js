const x = 'x'

async function f() {
  'use server'
  return x
}

async function g() {}

export async function h(formData) {
  'use server'
  return formData.get(x)
}

export default function w() {
  'use server'
}
