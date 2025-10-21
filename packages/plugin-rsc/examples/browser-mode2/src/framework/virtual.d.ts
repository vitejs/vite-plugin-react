declare module 'virtual:vite-rsc-browser-mode2/load-rsc' {
  const loadRsc: () => Promise<typeof import('./entry.rsc')>
  export default loadRsc
}
