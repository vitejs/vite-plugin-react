declare module 'connect' {
  const default_: () => import('vite').Connect.Server
  export default default_
}

declare module 'virtual:middleware-mode/handler' {
  const default_: import('vite').Connect.NextHandleFunction
  export default default_
}
