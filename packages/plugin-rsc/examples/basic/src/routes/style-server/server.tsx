import './server.css'
import styles from './server.module.css'
import styleUrl from './server-url.css?url'

export function TestStyleServer() {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
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
