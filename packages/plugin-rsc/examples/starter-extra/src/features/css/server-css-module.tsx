import styles from './server-css-module.module.css'

export function ServerCssModule() {
  return (
    <button
      data-testid="starter-extra-server-css-module"
      className={styles.serverCssModule}
    >
      server css module
    </button>
  )
}
