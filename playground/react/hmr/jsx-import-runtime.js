import * as JsxRuntime from 'react/jsx-runtime'

export function JsxImportRuntime() {
  return JsxRuntime.jsx('p', {
    id: 'jsx-import-runtime',
    children: 'JSX import runtime works',
  })
}
