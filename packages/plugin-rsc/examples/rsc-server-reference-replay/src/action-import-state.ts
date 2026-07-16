let actionImported = false

export function markActionImported() {
  actionImported = true
}

export function wasActionImported() {
  return actionImported
}
