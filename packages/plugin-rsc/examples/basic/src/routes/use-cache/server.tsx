import { revalidateCache } from '../../use-cache-runtime'

export function TestUseCache() {
  return (
    <>
      <TestUseCacheFn />
      <TestUseCacheComponent />
      <TestUseCacheClosure />
    </>
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
        if (argument === 'revalidate') {
          revalidateCache(testFn)
        }
      }}
    >
      <button>test-use-cache-fn</button>
      <input className="w-25" name="argument" placeholder="argument" />
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
  // NOTE: wrapping with `span` (or any jsx) is crucial because
  // raw string `children` would get included as cache key
  // and thus causes `TestComponent` to be evaluated in each render.
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
    <div data-testid="test-use-cache-closure" className="flex gap-1">
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
        <input className="w-15" name="outer" placeholder="outer" />
        <input className="w-15" name="inner" placeholder="inner" />
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
