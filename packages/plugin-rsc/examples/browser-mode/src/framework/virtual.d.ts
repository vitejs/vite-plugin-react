declare module 'virtual:vite-rsc-browser-mode/build-client-references' {
  const default_: Record<string, () => Promise<any>>
  export default default_
}

declare module 'virtual:vite-rsc-browser-mode/build-server-references' {
  const default_: Record<string, () => Promise<any>>
  export default default_
}

declare module 'virtual:vite-rsc-browser-mode/load-client' {
  const default_: () => Promise<typeof import('./entry.browser')>
  export default default_
}
