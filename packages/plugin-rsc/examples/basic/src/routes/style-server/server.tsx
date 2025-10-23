import './server.css'
import styleUrl from './server-url.css?url'
import styles from './server.module.css'

export function TestStyleServer() {
  return (
    <div style={{ display: 'flex' }}>
      <div className="test-style-server">test-style-server</div>
      <span>|</span>
      <div data-testid="css-module-server" className={styles.server}>
        test-css-module-server
      </div>
      <span>|</span>
      <link
        rel="stylesheet"
        href={styleUrl}
        precedence="test-style-manual-link"
      />
      <div className="test-style-url-server">test-style-url-server</div>
      <span>|</span>
      <link
        rel="stylesheet"
        href="/test-style-server-manual.css"
        precedence="test-style-manual-link"
      />
      <div className="test-style-server-manual">test-style-server-manual</div>
    </div>
  )
}

// add no-op `import.meta.hot` to trigger `prune` event.
// this is needed until we land https://github.com/vitejs/vite/pull/20768
import.meta.hot
