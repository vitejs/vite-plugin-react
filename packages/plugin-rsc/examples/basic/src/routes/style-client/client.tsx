'use client'

import './client.css'
import { TestClientDep } from './client-dep'
import styles from './client.module.css'
import styleUrl from './client-url.css?url'

export function TestStyleClient() {
  return (
    <div style={{ display: 'flex' }}>
      <div className="test-style-client">test-style-client</div>
      <span>|</span>
      <div data-testid="css-module-client" className={styles.client}>
        test-css-module-client
      </div>
      <span>|</span>
      <link
        rel="stylesheet"
        href={styleUrl}
        precedence="test-style-manual-link"
      />
      <div className="test-style-url-client">test-style-url-client</div>
      <span>|</span>
      <TestClientDep />
    </div>
  )
}
