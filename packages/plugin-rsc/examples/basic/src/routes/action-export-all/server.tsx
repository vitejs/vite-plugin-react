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
          export-all-server-to-server: {readExportAllServerValue()}
        </button>
      </form>
      <TestActionExportAllClient />
    </>
  )
}
