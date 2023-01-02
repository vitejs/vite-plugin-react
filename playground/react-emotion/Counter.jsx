import styled from '@emotion/styled'
import { css } from '@emotion/react'
import { useState } from 'react'

// Ensure HMR of styled component alongside other components
export const StyledCode = styled.code`
  color: #646cff;
`

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button
      css={css`
        border: 2px solid #000;
      `}
      onClick={() => setCount((count) => count + 1)}
    >
      count is: {count}
    </button>
  )
}
