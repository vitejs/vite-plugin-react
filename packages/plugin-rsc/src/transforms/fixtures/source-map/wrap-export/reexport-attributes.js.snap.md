## Input

```js
'use server'

export { reexportedAction } from './reexport-source' with { type: 'json' }
```

## wrap-export

**Status:** transformed

**References:** reexportedAction

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjkyACd1c2Ugc2VydmVyJwoKCmltcG9ydCB7IHJlZXhwb3J0ZWRBY3Rpb24gYXMgJCRpbXBvcnRfcmVleHBvcnRlZEFjdGlvbiB9IGZyb20gJy4vcmVleHBvcnQtc291cmNlJzsKY29uc3QgJCR3cmFwXyQkaW1wb3J0X3JlZXhwb3J0ZWRBY3Rpb24gPSAvKiAjX19QVVJFX18gKi8gcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoJCRpbXBvcnRfcmVleHBvcnRlZEFjdGlvbiwgInJlZXhwb3J0ZWRBY3Rpb24iKTsKZXhwb3J0IHsgJCR3cmFwXyQkaW1wb3J0X3JlZXhwb3J0ZWRBY3Rpb24gYXMgcmVleHBvcnRlZEFjdGlvbiB9OwoxOTcAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IHsgcmVleHBvcnRlZEFjdGlvbiB9IGZyb20gJy4vcmVleHBvcnQtc291cmNlJyB3aXRoIHsgdHlwZTogJ2pzb24nIH1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOzs7Ozs7In0=)

```js
'use server'


import { reexportedAction as $$import_reexportedAction } from './reexport-source';
const $$wrap_$$import_reexportedAction = /* #__PURE__ */ registerServerReference($$import_reexportedAction, "reexportedAction");
export { $$wrap_$$import_reexportedAction as reexportedAction };
```

## module-export-effect

**Status:** transformed

**References:** reexportedAction

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjU4ACd1c2Ugc2VydmVyJwoKZXhwb3J0IHsgcmVleHBvcnRlZEFjdGlvbiB9IGZyb20gJy4vcmVleHBvcnQtc291cmNlJyB3aXRoIHsgdHlwZTogJ2pzb24nIH0KCmltcG9ydCB7IHJlZXhwb3J0ZWRBY3Rpb24gYXMgJCRlZmZlY3RfaW1wb3J0X3JlZXhwb3J0ZWRBY3Rpb24gfSBmcm9tICcuL3JlZXhwb3J0LXNvdXJjZSc7CnJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKCQkZWZmZWN0X2ltcG9ydF9yZWV4cG9ydGVkQWN0aW9uLCAicmVleHBvcnRlZEFjdGlvbiIpOzM0NwB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJ1xuXG5leHBvcnQgeyByZWV4cG9ydGVkQWN0aW9uIH0gZnJvbSAnLi9yZWV4cG9ydC1zb3VyY2UnIHdpdGggeyB0eXBlOiAnanNvbicgfVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsR0FBRyxDQUFDLE1BQU07O0FBRVgsTUFBTSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7OzsifQ==)

```js
'use server'

export { reexportedAction } from './reexport-source' with { type: 'json' }

import { reexportedAction as $$effect_import_reexportedAction } from './reexport-source';
registerServerReference($$effect_import_reexportedAction, "reexportedAction");
```

## proxy-export

**Status:** transformed

**References:** reexportedAction

[Source map visualization](https://evanw.github.io/source-map-visualization/#OTQACgpleHBvcnQgY29uc3QgcmVleHBvcnRlZEFjdGlvbiA9IC8qICNfX1BVUkVfXyAqLyBjcmVhdGVTZXJ2ZXJSZWZlcmVuY2UoInJlZXhwb3J0ZWRBY3Rpb24iKTsKCjE3NQB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJ1xuXG5leHBvcnQgeyByZWV4cG9ydGVkQWN0aW9uIH0gZnJvbSAnLi9yZWV4cG9ydC1zb3VyY2UnIHdpdGggeyB0eXBlOiAnanNvbicgfVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUE7OyJ9)

```js


export const reexportedAction = /* #__PURE__ */ createServerReference("reexportedAction");

```
