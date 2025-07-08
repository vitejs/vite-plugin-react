import { TestActionStateClient } from './client'

// Test case based on
// https://github.com/remix-run/react-router/issues/13882

export function TestActionStateServer() {
  const time = new Date().toISOString() // test closure encryption
  return (
    <TestActionStateClient
      action={async (prev: React.ReactNode) => {
        'use server'
        await new Promise((resolve) => setTimeout(resolve, 500))
        return (
          <span>
            [(ok) (time: {time})] {prev}
          </span>
        )
      }}
    />
  )
}
