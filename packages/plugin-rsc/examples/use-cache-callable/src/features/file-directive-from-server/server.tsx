import { cachedFromServer } from './action'
import { FileDirectiveFromServerClient } from './client'

export function FileDirectiveFromServer() {
  return <FileDirectiveFromServerClient action={cachedFromServer} />
}
