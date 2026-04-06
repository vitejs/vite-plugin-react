function outer() {
  const value = 0
  function action() {
    if (true) {
      const value = 1
      return value
    }
  }
}
