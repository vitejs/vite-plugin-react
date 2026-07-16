let result = 'initial'

export function getServerState() {
  return result
}

export function setServerState(value: string) {
  result = value
}
