declare module 'connect' {
  const default_: () => import('vite').Connect.Server
  export default default_
}
