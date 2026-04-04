class Foo {}
;(function (Foo) {
  Foo.x = 1
})(Foo || (Foo = {}))
const usage = Foo
