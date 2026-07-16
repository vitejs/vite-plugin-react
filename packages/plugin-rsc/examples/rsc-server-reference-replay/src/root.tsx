export function Root(props: {
  actionImported: boolean
  cachedContent: React.ReactNode
}) {
  return (
    <html>
      <body>
        <h1>Persisted Flight server reference</h1>
        <p>
          Action imported in the RSC environment:{' '}
          <output data-testid="action-imported">
            {String(props.actionImported)}
          </output>
        </p>
        {props.cachedContent}
      </body>
    </html>
  )
}
