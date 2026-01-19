export async function TestImportEnvironment() {
  const { testSsrModule } = await import.meta.viteRsc.import<
    typeof import('./ssr')
  >('./ssr.tsx', { environment: 'ssr' })
  const html = await testSsrModule()
  return (
    <div data-testid="import-environment">
      [test-import-environment:{' '}
      <span dangerouslySetInnerHTML={{ __html: html }} />]
    </div>
  )
}
