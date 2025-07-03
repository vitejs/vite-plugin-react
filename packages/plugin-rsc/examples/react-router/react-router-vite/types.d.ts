/// <reference types="vite/client" />
/// <reference types="@hiogawa/vite-rsc/types" />

declare module 'react-dom/server.edge' {
  export * from 'react-dom/server'
}

declare module 'virtual:react-router-routes' {
  const routes: any
  export default routes
}
