import './shared.css'
import styles from './shared.module.css'

export function SharedStyle(props: {
  className: string
  styleTestId: string
  moduleTestId: string
  label: string
}) {
  return (
    <>
      <div className={props.className} data-testid={props.styleTestId}>
        test-style-shared-{props.label}
      </div>
      <span>|</span>
      <div className={styles.shared} data-testid={props.moduleTestId}>
        test-css-module-shared-{props.label}
      </div>
    </>
  )
}
