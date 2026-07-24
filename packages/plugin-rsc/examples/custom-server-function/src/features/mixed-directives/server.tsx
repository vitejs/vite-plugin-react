import {
  customLabel,
  getCounts,
  incrementBuiltin,
  incrementCustom,
  resetCounts,
} from './actions.ts'

export function MixedDirectives() {
  const { builtinCount, customCount } = getCounts()
  return (
    <>
      <form action={incrementBuiltin}>
        <button>Built-in: {builtinCount}</button>
      </form>
      <form action={incrementCustom}>
        <button>
          {customLabel}: {customCount}
        </button>
      </form>
      <form action={resetCounts}>
        <button>Reset</button>
      </form>
    </>
  )
}
