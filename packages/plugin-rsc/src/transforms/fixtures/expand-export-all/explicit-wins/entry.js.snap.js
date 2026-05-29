export { shared, fromDep } from "./dep.js";
export const shared = 1


/* PARSE ERROR: Parse failed with 1 error:
Duplicated export 'shared'
1: export { shared, fromDep } from "./dep.js";
            ^
2: export const shared = 1
1: export { shared, fromDep } from "./dep.js";
2: export const shared = 1
                ^ */