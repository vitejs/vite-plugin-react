var _a;
const outer1 = 'a';
const outer2 = 'b';
class A {
    constructor() {
        this[_a] = 1;
    }
    [(_a = outer1, outer2)]() { }
}
