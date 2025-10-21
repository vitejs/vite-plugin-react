declare module 'virtual:vite-rsc-browser-mode2/load-client' {
  const loadClient: () => Promise<typeof import('./entry.browser')>
  export default loadClient
}
