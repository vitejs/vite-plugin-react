import { sayHello } from './home.actions.ts'
import { PendingButton } from './home.client.tsx'
import './home.css'
import { TestActionStateServer } from './test-action-state/server.tsx'

const Component = () => {
  return (
    <main className="container my-8 px-8 mx-auto">
      <article className="paper prose max-w-none">
        <h1>Home</h1>
        <p>This is the home page.</p>
        <span className="test-style-home">[test-style-home]</span>
        <h2>Server Action</h2>
        <form
          className="no-prose grid gap-6"
          action={sayHello.bind(null, 'Demo')}
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
              placeholder={'Demo'}
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
