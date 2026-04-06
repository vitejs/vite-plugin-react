var Foo;
(function (Foo) {
    const x = 1;
})(Foo || (Foo = {}));
const unresolved = x;
