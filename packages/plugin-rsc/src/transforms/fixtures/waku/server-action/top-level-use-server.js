'use server'

const privateFunction = () => 'Secret'

export const log = async (mesg) => {
  console.log('%s', mesg)
}

export async function greet(name) {
  return 'Hello ' + name
}

export default async function () {
  return Date.now()
}
