import {
  customLabel,
  getCounts,
  incrementBuiltin,
  incrementCustom,
  resetCounts,
} from './actions.ts'
import {
  getComposedCount,
  incrementComposed,
} from './composed-action.ts'

export async function MixedDirectives() {
  const { builtinCount, customCount } = getCounts()
  const composedCount = await getComposedCount()
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
      <form action={incrementComposed}>
        <button>Composed: {composedCount}</button>
      </form>
      <form action={resetCounts}>
        <button>Reset</button>
      </form>
    </>
  )
}
