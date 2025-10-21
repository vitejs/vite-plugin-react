declare module 'virtual:vite-rsc-browser-mode2/load-client' {
  const loadClient: () => Promise<typeof import('./entry.browser')>
  export default loadClient
}

declare module 'virtual:vite-rsc-browser-mode2/load-server' {
  const loadServer: () => Promise<typeof import('./entry.rsc')>
  export default loadServer
}
