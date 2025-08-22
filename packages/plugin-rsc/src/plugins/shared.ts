export function toCssVirtual({
  id,
  type,
}: {
  id: string
  type: 'ssr' | 'rsc' | 'rsc-browser'
}) {
  // ensure other plugins treat it as a plain js file
  // e.g. https://github.com/vitejs/rolldown-vite/issues/372#issuecomment-3193401601
  return `virtual:vite-rsc/css?type=${type}&id=${encodeURIComponent(id)}&lang.js`
}

export function parseCssVirtual(id: string):
  | {
      id: string
      type: 'ssr' | 'rsc' | 'rsc-browser'
    }
  | undefined {
  if (id.startsWith('\0virtual:vite-rsc/css?')) {
    return parseIdQuery(id).query as any
  }
}

// https://github.com/vitejs/vite-plugin-vue/blob/06931b1ea2b9299267374cb8eb4db27c0626774a/packages/plugin-vue/src/utils/query.ts#L13
export function parseIdQuery(id: string): {
  filename: string
  query: {
    [k: string]: string
  }
} {
  if (!id.includes('?')) return { filename: id, query: {} }
  const [filename, rawQuery] = id.split(`?`, 2) as [string, string]
  const query = Object.fromEntries(new URLSearchParams(rawQuery))
  return { filename, query }
}
