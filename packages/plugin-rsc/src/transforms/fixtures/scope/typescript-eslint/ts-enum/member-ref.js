var Foo;
(function (Foo) {
    Foo[Foo["a"] = 1] = "a";
    Foo[Foo["b"] = 1] = "b";
})(Foo || (Foo = {}));
