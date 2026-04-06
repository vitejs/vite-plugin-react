// TODO: named function expression self-reference `self` is left dangling in hoisted body
function outer(count) {
  const action = async function self(n) {
    'use server'
    if (n > 0) return self(n - 1)
    return count
  }
}
