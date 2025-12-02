declare module 'virtual:vite-rsc/assets-manifest' {
  const assetsManifest: import('../plugin').ResolvedAssetsManifest
  export default assetsManifest
}

declare module 'virtual:vite-rsc/client-references' {
  const default_: Record<string, () => Promise<unknown>>
  export default default_
  export const assetDeps: Record<string, import('./plugin').AssetDeps> | undefined
}

declare module 'virtual:vite-rsc/server-references' {
  const default_: Record<string, () => Promise<unknown>>
  export default default_
}

declare module 'virtual:vite-rsc/encryption-key' {
  const default_: () => string | Promise<string>
  export default default_
}
