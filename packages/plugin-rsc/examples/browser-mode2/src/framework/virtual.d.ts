declare module 'virtual:vite-rsc-browser-mode2/load-rsc' {
  const loadRsc: () => Promise<typeof import('./entry.rsc')>
  export default loadRsc
}

declare module 'virtual:vite-rsc-browser-mode2/build-client-references' {
  const buildClientReferences: Record<string, () => Promise<any>>
  export default buildClientReferences
}

declare module 'virtual:vite-rsc-browser-mode2/build-server-references' {
  const buildServerReferences: Record<string, () => Promise<any>>
  export default buildServerReferences
}
