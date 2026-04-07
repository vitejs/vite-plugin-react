var _a;
const outer1 = 'a';
const outer2 = 'b';
const A = class {
    constructor() {
        this[_a] = 1;
    }
    [(_a = outer1, outer2)]() { }
};
