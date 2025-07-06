'use server'

let counter = 0

export async function getCounter() {
  return counter
}

export async function changeCounter(change) {
  counter += change
  return counter
}
