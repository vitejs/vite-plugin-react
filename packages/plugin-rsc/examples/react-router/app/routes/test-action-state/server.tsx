import { TestActionStateClient } from './client'

// Test case based on
// https://github.com/remix-run/react-router/issues/13882

export function TestActionStateServer({ message }: { message: string }) {
  return (
    <TestActionStateClient
      action={async (prev: React.ReactNode) => {
        'use server'
        await new Promise((resolve) => setTimeout(resolve, 200))
        return (
          <span>
            [(ok) ({message})] {prev}
          </span>
        )
      }}
    />
  )
}
