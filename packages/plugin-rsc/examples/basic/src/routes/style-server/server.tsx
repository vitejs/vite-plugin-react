import './server.css'
import styles from './server.module.css'
// import { TestStyleServerNotDetected } from "./not-detected/server";

export async function TestStyleServer() {
  const { TestStyleServerNotDetected } = await import('./not-detected/server')
  return (
    <>
      <div className="test-style-server">test-style-server</div>
      <div data-testid="css-module-server" className={styles.server}>
        test-css-module-server
      </div>
      <TestStyleServerNotDetected />
    </>
  )
}
