import data from './data.json' with { type: 'json' }

export function TestImportAttributes() {
  return (
    <div>
      import-attirbutes: <span class="import-attributes">{data.message}</span>
    </div>
  )
}
