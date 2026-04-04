export var A;
(function (A) {
    let X;
    (function (X) {
        X.Y = 1;
    })(X = A.X || (A.X = {}));
})(A || (A = {}));
const X = 23;
