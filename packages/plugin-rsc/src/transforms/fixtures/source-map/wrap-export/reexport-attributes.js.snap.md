## Input

```js
'use server'

export { reexportedAction } from './reexport-source' with { type: 'json' }
```

## wrap-export

**Status:** transformed

**References:** reexportedAction

[Source map visualization](https://evanw.github.io/source-map-visualization/#Mjk0ACd1c2Ugc2VydmVyJwoKCjsKaW1wb3J0IHsgcmVleHBvcnRlZEFjdGlvbiBhcyAkJGltcG9ydF9yZWV4cG9ydGVkQWN0aW9uIH0gZnJvbSAnLi9yZWV4cG9ydC1zb3VyY2UnOwpjb25zdCAkJHdyYXBfJCRpbXBvcnRfcmVleHBvcnRlZEFjdGlvbiA9IC8qICNfX1BVUkVfXyAqLyByZWdpc3RlclNlcnZlclJlZmVyZW5jZSgkJGltcG9ydF9yZWV4cG9ydGVkQWN0aW9uLCAicmVleHBvcnRlZEFjdGlvbiIpOwpleHBvcnQgeyAkJHdyYXBfJCRpbXBvcnRfcmVleHBvcnRlZEFjdGlvbiBhcyByZWV4cG9ydGVkQWN0aW9uIH07CjE5OAB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJ1xuXG5leHBvcnQgeyByZWV4cG9ydGVkQWN0aW9uIH0gZnJvbSAnLi9yZWV4cG9ydC1zb3VyY2UnIHdpdGggeyB0eXBlOiAnanNvbicgfVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsR0FBRyxDQUFDLE1BQU07Ozs7Ozs7In0=)

```js
'use server'


;
import { reexportedAction as $$import_reexportedAction } from './reexport-source';
const $$wrap_$$import_reexportedAction = /* #__PURE__ */ registerServerReference($$import_reexportedAction, "reexportedAction");
export { $$wrap_$$import_reexportedAction as reexportedAction };
```

## module-export-effect

**Status:** transformed

**References:** reexportedAction

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjYwACd1c2Ugc2VydmVyJwoKCgpleHBvcnQgeyByZWV4cG9ydGVkQWN0aW9uIH0gZnJvbSAnLi9yZWV4cG9ydC1zb3VyY2UnIHdpdGggeyB0eXBlOiAnanNvbicgfQpyZWdpc3RlclNlcnZlclJlZmVyZW5jZSgkJGVmZmVjdF9pbXBvcnRfcmVleHBvcnRlZEFjdGlvbiwgInJlZXhwb3J0ZWRBY3Rpb24iKTsKCmltcG9ydCB7IHJlZXhwb3J0ZWRBY3Rpb24gYXMgJCRlZmZlY3RfaW1wb3J0X3JlZXhwb3J0ZWRBY3Rpb24gfSBmcm9tICcuL3JlZXhwb3J0LXNvdXJjZSc7MjEwAHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmV4cG9ydCB7IHJlZXhwb3J0ZWRBY3Rpb24gfSBmcm9tICcuL3JlZXhwb3J0LXNvdXJjZScgd2l0aCB7IHR5cGU6ICdqc29uJyB9XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxHQUFHLENBQUMsTUFBTTs7O0FBRVg7QUFBQTtBQUFBOzsifQ==)

```js
'use server'



export { reexportedAction } from './reexport-source' with { type: 'json' }
registerServerReference($$effect_import_reexportedAction, "reexportedAction");

import { reexportedAction as $$effect_import_reexportedAction } from './reexport-source';
```
