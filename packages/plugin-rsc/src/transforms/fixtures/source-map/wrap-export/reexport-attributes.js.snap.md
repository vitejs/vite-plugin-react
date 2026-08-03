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

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjU4ACd1c2Ugc2VydmVyJwoKZXhwb3J0IHsgcmVleHBvcnRlZEFjdGlvbiB9IGZyb20gJy4vcmVleHBvcnQtc291cmNlJyB3aXRoIHsgdHlwZTogJ2pzb24nIH0KCmltcG9ydCB7IHJlZXhwb3J0ZWRBY3Rpb24gYXMgJCRlZmZlY3RfaW1wb3J0X3JlZXhwb3J0ZWRBY3Rpb24gfSBmcm9tICcuL3JlZXhwb3J0LXNvdXJjZSc7CnJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKCQkZWZmZWN0X2ltcG9ydF9yZWV4cG9ydGVkQWN0aW9uLCAicmVleHBvcnRlZEFjdGlvbiIpOzM0NwB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJ1xuXG5leHBvcnQgeyByZWV4cG9ydGVkQWN0aW9uIH0gZnJvbSAnLi9yZWV4cG9ydC1zb3VyY2UnIHdpdGggeyB0eXBlOiAnanNvbicgfVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsR0FBRyxDQUFDLE1BQU07O0FBRVgsTUFBTSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7OzsifQ==)

```js
'use server'

export { reexportedAction } from './reexport-source' with { type: 'json' }

import { reexportedAction as $$effect_import_reexportedAction } from './reexport-source';
registerServerReference($$effect_import_reexportedAction, "reexportedAction");
```

## module-export-wrap

**Status:** transformed

**References:** reexportedAction

[Source map visualization](https://evanw.github.io/source-map-visualization/#MzU1ACd1c2Ugc2VydmVyJwoKCgppbXBvcnQgeyByZWV4cG9ydGVkQWN0aW9uIGFzICQkbW9kdWxlXzBfaW1wbGVtZW50YXRpb25fcmVleHBvcnRlZEFjdGlvbiB9IGZyb20gJy4vcmVleHBvcnQtc291cmNlJyB3aXRoIHsgdHlwZTogJ2pzb24nIH07CmNvbnN0ICQkbW9kdWxlXzBfYmluZGluZ19yZWV4cG9ydGVkQWN0aW9uID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKCQkbW9kdWxlXzBfaW1wbGVtZW50YXRpb25fcmVleHBvcnRlZEFjdGlvbiwgInJlZXhwb3J0ZWRBY3Rpb24iKTsKZXhwb3J0IHsgJCRtb2R1bGVfMF9iaW5kaW5nX3JlZXhwb3J0ZWRBY3Rpb24gYXMgcmVleHBvcnRlZEFjdGlvbiB9OwoxOTgAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IHsgcmVleHBvcnRlZEFjdGlvbiB9IGZyb20gJy4vcmVleHBvcnQtc291cmNlJyB3aXRoIHsgdHlwZTogJ2pzb24nIH1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOzs7Ozs7OyJ9)

```js
'use server'



import { reexportedAction as $$module_0_implementation_reexportedAction } from './reexport-source' with { type: 'json' };
const $$module_0_binding_reexportedAction = /* #__PURE__ */ registerServerReference($$module_0_implementation_reexportedAction, "reexportedAction");
export { $$module_0_binding_reexportedAction as reexportedAction };
```
