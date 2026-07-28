import { FileDirectiveFromClient } from './client'
import { state } from './state'

export function FileDirectiveFromClientServer() {
  return <FileDirectiveFromClient result={state.result} />
}
