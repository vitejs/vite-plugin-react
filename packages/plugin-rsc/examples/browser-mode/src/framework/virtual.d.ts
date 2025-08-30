declare module 'virtual:vite-rsc-minimal/client-references' {
  const default_: Record<string, () => Promise<any>>
  export default default_
}

declare module 'virtual:vite-rsc-minimal/server-references' {
  const default_: Record<string, () => Promise<any>>
  export default default_
}

declare module 'virtual:vite-rsc-browser-mode/load-client' {
  const default_: () => Promise<typeof import('./entry.browser')>
  export default default_
}
