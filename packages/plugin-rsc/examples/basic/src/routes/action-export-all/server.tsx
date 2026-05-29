import {
  incrementExportAllServerValue,
  readExportAllServerValue,
} from './actions'
import { TestActionExportAllClient } from './client'

export function TestActionExportAll() {
  return (
    <>
      <form action={incrementExportAllServerValue}>
        <button data-testid="test-action-export-all-server">
          server-to-server: {readExportAllServerValue()}
        </button>
      </form>
      <TestActionExportAllClient />
    </>
  )
}
