declare module 'virtual:route-action-manifest' {
  const manifest: Record<string, string[]> | null
  export default manifest
}

declare module 'virtual:route-server-references' {
  const references: Record<string, () => Promise<Record<string, unknown>>>
  export default references
}

declare module 'virtual:route-deployments' {
  const deployments: Record<
    string,
    () => Promise<{ default: { fetch(request: Request): Promise<Response> } }>
  >
  export default deployments
}
