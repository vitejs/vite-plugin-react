function f({ a, b: [c, d] }, ...rest) {
  return a + c + d + rest.length
}
