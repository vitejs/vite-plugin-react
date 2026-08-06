// https://github.com/remix-run/react-router/blob/98367e49900701c460cb08eb16c2441da5007efc/playground/rsc-vite/src/routes/home/home.tsx
export {} from 'edge-case'
import { redirect } from 'react-router/rsc'

export default () => {
  const redirectOnServer = /* #__PURE__ */ $$register($$hoist_0_redirectOnServer, "<id>", "$$hoist_0_redirectOnServer")
}

;export async function $$hoist_0_redirectOnServer() {
    'use server'
    throw redirect()
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_redirectOnServer, "name", { value: "redirectOnServer" });
