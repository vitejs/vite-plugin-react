import { transitiveLabel } from './transitive'

export function getDirectLabel() {
  return `direct-v1 + ${transitiveLabel}`
}
