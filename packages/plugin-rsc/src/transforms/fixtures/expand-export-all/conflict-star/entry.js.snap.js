'use client'

export { shared, onlyA } from "./a.js";
export { shared, onlyB } from "./b.js";


/* PARSE ERROR: Parse failed with 1 error:
Duplicated export 'shared'
1: 'use client'
2: 
3: export { shared, onlyA } from "./a.js";
            ^
4: export { shared, onlyB } from "./b.js";
2: 
3: export { shared, onlyA } from "./a.js";
4: export { shared, onlyB } from "./b.js";
            ^ */