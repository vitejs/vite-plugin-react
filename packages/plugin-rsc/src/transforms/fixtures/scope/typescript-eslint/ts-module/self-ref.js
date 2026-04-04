var Foo
;(function (Foo) {
  Foo.x = 1
  Foo.x
})(Foo || (Foo = {}))
