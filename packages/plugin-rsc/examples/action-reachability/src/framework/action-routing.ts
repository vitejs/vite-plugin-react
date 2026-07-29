import routeActionManifest from 'virtual:route-action-manifest'

export function resolveActionRoute(actionId: string) {
  if (!routeActionManifest) {
    return { enabled: false } as const
  }

  const pathname = Object.entries(routeActionManifest).find(([, actionIds]) =>
    actionIds.includes(actionId),
  )?.[0]
  return { enabled: true, pathname } as const
}
