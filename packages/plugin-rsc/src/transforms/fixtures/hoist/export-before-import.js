// https://github.com/remix-run/react-router/blob/98367e49900701c460cb08eb16c2441da5007efc/playground/rsc-vite/src/routes/home/home.tsx
export {} from 'edge-case'
import { redirect } from 'react-router/rsc'

export default () => {
  const redirectOnServer = async () => {
    'use server'
    throw redirect()
  }
}
