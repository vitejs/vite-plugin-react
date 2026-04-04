const outer = 1
const A = class {
  constructor(a, b = 1, c = a, d = outer, e, f) {
    this.a = a
    this.b = b
    this.c = c
    this.d = d
    this.e = e
    this.f = f
    a
  }
}
const unresovled = e
