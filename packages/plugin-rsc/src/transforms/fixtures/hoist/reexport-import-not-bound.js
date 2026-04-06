export { redirect } from 'react-router/rsc'
import { redirect } from 'react-router/rsc'

export default () => {
  const f = async () => {
    'use server'
    throw redirect()
  }
}
