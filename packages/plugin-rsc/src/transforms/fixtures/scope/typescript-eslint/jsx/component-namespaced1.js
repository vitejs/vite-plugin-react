import { jsx as _jsx } from "react/jsx-runtime";
const X = {
    Foo() { },
};
const Foo = 1; // should be unreferenced
_jsx(X.Foo, {});
