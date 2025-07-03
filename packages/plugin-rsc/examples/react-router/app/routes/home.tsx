namespace Route {
  export type LoaderArgs = any
  export type ComponentProps = any
}

import { sayHello } from './home.actions.ts'
import { PendingButton } from './home.client.tsx'
import './home.css'
import { TestActionStateServer } from './test-action-state/server.tsx'

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const name = url.searchParams.get('name')
  return { name: name || 'Unknown' }
}

const Component = ({ loaderData }: Route.ComponentProps) => {
  return (
    <main className="container my-8 px-8 mx-auto">
      <article className="paper prose max-w-none">
        <h1>Home</h1>
        <p>This is the home page.</p>
        <span className="test-style-home">[test-style-home]</span>
        <pre>
          <code>loaderData: {JSON.stringify(loaderData)}</code>
        </pre>
        <h2>Server Action</h2>
        <form
          className="no-prose grid gap-6"
          action={sayHello.bind(null, loaderData.name)}
        >
          <div className="grid gap-1">
            <label className="label" htmlFor="name">
              Name
            </label>
            <input
              className="input"
              id="name"
              type="text"
              name="name"
              placeholder={loaderData.name}
            />
          </div>
          <div>
            <PendingButton />
          </div>
        </form>
        <div className="mt-4">
          <TestActionStateServer message={`${new Date().toISOString()}`} />
        </div>
      </article>
    </main>
  )
}

export default Component
