import { ExportAllA, ExportAllB, ExportAllNamed } from '.'

export function TestExportAll() {
  return (
    <div data-testid="test-export-all">
      test-export-all:
      <ExportAllA />|<ExportAllB />|<ExportAllNamed />
    </div>
  )
}
