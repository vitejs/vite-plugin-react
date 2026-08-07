import { transitiveLabel } from './dep-transitive'

export function getDirectLabel() {
  return `direct-v1 + ${transitiveLabel}`
}
