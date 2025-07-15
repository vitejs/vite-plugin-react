'use client'

import './client.css'
import { TestClientDep } from './client-dep'
import styles from './client.module.css'

export function TestStyleClient() {
  return (
    <>
      <div className="test-style-client">test-style-client</div>
      <div data-testid="css-module-client" className={styles.client}>
        test-css-module-client
      </div>
      <TestClientDep />
    </>
  )
}
