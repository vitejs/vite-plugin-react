export async function TestImportEnvironment() {
  const ssr = await import.meta.viteRsc.import<typeof import('./ssr')>(
    './ssr.tsx',
    { environment: 'ssr' },
  )
  const html = ssr.testSsrModule()
  return (
    <div data-testid="import-environment">
      [test-import-environment:{' '}
      <span dangerouslySetInnerHTML={{ __html: html }} />]
    </div>
  )
}
