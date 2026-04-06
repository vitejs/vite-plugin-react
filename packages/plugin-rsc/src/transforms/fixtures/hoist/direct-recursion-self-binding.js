// TODO: follow up if this edge case matters.
// The current transform self-binds `action`, which is suspicious enough to
// keep as an intentionally verified TODO fixture for now.
function outer() {
  async function action() {
    'use server'
    if (false) {
      return action()
    }
    return 0
  }
}
