'use server'

const privateFunction = () => 'Secret'

export const log1 = async function (mesg) {
  console.log(mesg)
}

export const log2 = async (mesg) => {
  console.log(mesg)
}

export async function log3(mesg) {
  console.log(mesg)
}

export default async function log4(mesg) {
  console.log(mesg)
}
