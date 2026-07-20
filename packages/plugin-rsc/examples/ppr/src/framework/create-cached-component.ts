import type React from 'react'

export function createCachedComponent<Props extends object>(
  Component: (props: Props) => React.ReactNode | Promise<React.ReactNode>,
): (props: Props) => React.ReactNode | Promise<React.ReactNode> {
  // TODO: Cache the rendered subtree as Flight bytes while preserving dynamic
  // props as temporary references, then persist build-time entries for runtime.
  return Component
}
