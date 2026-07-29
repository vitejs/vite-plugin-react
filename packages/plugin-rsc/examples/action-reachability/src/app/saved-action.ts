export type Action = () => Promise<string>

let savedAction: Action | undefined

export function setSavedAction(action: Action) {
  savedAction = action
}

export function getSavedAction() {
  return savedAction
}
