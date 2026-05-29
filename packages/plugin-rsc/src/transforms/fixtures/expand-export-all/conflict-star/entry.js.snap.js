export { shared, onlyA } from "./a.js";
export { shared, onlyB } from "./b.js";


/* PARSE ERROR

Parse failed with 1 error:
Duplicated export 'shared'
1: export { shared, onlyA } from "./a.js";
            ^
2: export { shared, onlyB } from "./b.js";
1: export { shared, onlyA } from "./a.js";
2: export { shared, onlyB } from "./b.js";
            ^

*/