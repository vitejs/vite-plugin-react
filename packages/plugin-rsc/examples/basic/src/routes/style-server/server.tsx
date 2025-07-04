import './server.css'
import styles from './server.module.css'

export function TestStyleServer() {
  return (
    <>
      <div className="test-style-server">test-style-server</div>
      <div data-testid="css-module-server" className={styles.server}>
        test-css-module-server
      </div>
    </>
  )
}
