export type Action = () => Promise<string>

let savedAction: { action: Action; name: string } | undefined

export function setSavedAction(name: string, action: Action) {
  savedAction = { action, name }
}

export function getSavedAction() {
  return savedAction
}
