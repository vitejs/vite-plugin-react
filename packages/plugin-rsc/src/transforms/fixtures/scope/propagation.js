function outer() {
  const x = 0
  function inner() {
    const y = 1
    return x + y
  }
  return inner
}
