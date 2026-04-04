var Foo
;(function (Foo) {
  Foo[(Foo['a'] = 1)] = 'a'
})(Foo || (Foo = {}))
Foo.a
