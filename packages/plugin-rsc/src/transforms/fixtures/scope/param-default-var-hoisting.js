function outer() {
  const y = 'outer'
  function inner(x = y) {
    var y = 'inner'
    return x
  }
  return inner
}
