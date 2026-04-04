var Foo
;(function (Foo) {
  Foo.x = 1
})(Foo || (Foo = {}))
Foo.x
