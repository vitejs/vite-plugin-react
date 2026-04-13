// The hoist transform must preserve `function*` / `async function*` syntax.
// Previously the `*` was dropped, making `yield` a SyntaxError.
function outer() {
  const items = [1, 2, 3]

  async function* stream() {
    'use server'
    for (const item of items) {
      yield item
    }
  }

  return stream
}
