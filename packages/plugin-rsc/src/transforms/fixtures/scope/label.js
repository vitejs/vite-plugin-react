outer: for (let i = 0; i < 3; i++) {
  inner: for (let j = 0; j < 3; j++) {
    if (j === 1) break outer
    if (i === 1) continue inner
  }
}
