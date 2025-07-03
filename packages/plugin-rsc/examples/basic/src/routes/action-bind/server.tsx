// based on test cases in
// https://github.com/vercel/next.js/blob/ad898de735c393d98960a68c8d9eaeee32206c57/test/e2e/app-dir/actions/app/encryption/page.js

import { ActionBindClient } from './client'
import { TestServerActionBindClientForm } from './form'

export function TestServerActionBindReset() {
  return (
    <form
      action={async () => {
        'use server'
        testServerActionBindSimpleState = '[?]'
        testServerActionBindActionState = '[?]'
        testServerActionBindClientState++
      }}
    >
      <button>test-server-action-bind-reset</button>
    </form>
  )
}

let testServerActionBindSimpleState = '[?]'

export function TestServerActionBindSimple() {
  const outerValue = 'outerValue'

  return (
    <form
      action={async (formData: FormData) => {
        'use server'
        const result = String(formData.get('value')) === outerValue
        testServerActionBindSimpleState = JSON.stringify(result)
      }}
    >
      <input type="hidden" name="value" value={outerValue} />
      <button type="submit">test-server-action-bind-simple</button>
      <span data-testid="test-server-action-bind-simple">
        {testServerActionBindSimpleState}
      </span>
    </form>
  )
}

let testServerActionBindClientState = 0

export function TestServerActionBindClient() {
  // client element as server action bound argument
  const client = <ActionBindClient />

  const action = async () => {
    'use server'
    return client
  }

  return (
    <TestServerActionBindClientForm
      key={testServerActionBindClientState}
      action={action}
    />
  )
}

let testServerActionBindActionState = '[?]'

export function TestServerActionBindAction() {
  async function otherAction() {
    'use server'
    return 'otherActionValue'
  }

  function wrapAction(value: string, action: () => Promise<string>) {
    return async function (formValue: string) {
      'use server'
      const actionValue = await action()
      return [actionValue === 'otherActionValue', formValue === value]
    }
  }

  const action = wrapAction('ok', otherAction)

  return (
    <form
      action={async (formData: FormData) => {
        'use server'
        const result = await action(String(formData.get('value')))
        testServerActionBindActionState = JSON.stringify(result)
      }}
    >
      <input type="hidden" name="value" value="ok" />
      <button type="submit">test-server-action-bind-action</button>
      <span data-testid="test-server-action-bind-action">
        {testServerActionBindActionState}
      </span>
    </form>
  )
}
