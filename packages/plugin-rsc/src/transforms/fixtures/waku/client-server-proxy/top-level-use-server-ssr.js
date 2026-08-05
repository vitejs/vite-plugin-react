'use server'

import { getEnv } from 'waku'

const privateFunction = () => getEnv('SECRET')

export async function log(mesg) {
  console.log('%s', mesg)
}
