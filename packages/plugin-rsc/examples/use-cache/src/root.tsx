import { revalidateCache } from './framework/use-cache-runtime'

export function Root() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>RSC use cache</title>
      </head>
      <body>
        <h1>RSC use cache</h1>
        <TestUseCacheFn />
        <TestUseCacheComponent />
        <TestUseCacheClosure />
      </body>
    </html>
  )
}

function TestUseCacheFn() {
  return (
    <form
      data-testid="test-use-cache-fn"
      action={async (formData) => {
        'use server'
        actionCount++
        const argument = formData.get('argument')
        await testFn(argument)
        if (argument === 'revalidate') revalidateCache(testFn)
      }}
    >
      <button>test-use-cache-fn</button>
      <input name="argument" placeholder="argument" />
      <span>
        (actionCount: {actionCount}, cacheFnCount: {cacheFnCount})
      </span>
    </form>
  )
}

let actionCount = 0
let cacheFnCount = 0

async function testFn(..._args: unknown[]) {
  'use cache'
  cacheFnCount++
}

function TestUseCacheComponent() {
  // Wrapping children in JSX keeps their concrete value out of the cache key,
  // which allows the cached component to provide a static shell.
  return (
    <TestComponent>
      <span>{new Date().toISOString()}</span>
    </TestComponent>
  )
}

async function TestComponent(props: { children?: React.ReactNode }) {
  'use cache'
  return (
    <div data-testid="test-use-cache-component">
      [test-use-cache-component]{' '}
      <span data-testid="test-use-cache-component-static">
        (static: {new Date().toISOString()})
      </span>{' '}
      <span data-testid="test-use-cache-component-dynamic">
        (dynamic: {props.children})
      </span>
    </div>
  )
}

async function TestUseCacheClosure() {
  return (
    <div data-testid="test-use-cache-closure">
      <form
        action={async (formData) => {
          'use server'
          actionCount2++
          outerFnArg = formData.get('outer') as string
          innerFnArg = formData.get('inner') as string
          await outerFn(outerFnArg)(innerFnArg)
        }}
      >
        <button>test-use-cache-closure</button>
        <input name="outer" placeholder="outer" />
        <input name="inner" placeholder="inner" />
      </form>
      <span>
        (actionCount: {actionCount2}, innerFnCount: {innerFnCount})
      </span>
    </div>
  )
}

function outerFn(outer: string) {
  async function innerFn(inner: string) {
    'use cache'
    innerFnCount++
    console.log({ outer, inner })
  }
  return innerFn
}

let outerFnArg = ''
let innerFnArg = ''
let innerFnCount = 0
let actionCount2 = 0
