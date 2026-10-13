## Input

```js
'use server'

export { action }
const action = async () => 'action called'
```

## wrap-export

**Status:** transformed

**References:** action

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTc1ACd1c2Ugc2VydmVyJwoKCmNvbnN0IGFjdGlvbiA9IGFzeW5jICgpID0+ICdhY3Rpb24gY2FsbGVkJwpjb25zdCAkJHdyYXBfYWN0aW9uID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKGFjdGlvbiwgImFjdGlvbiIpOwpleHBvcnQgeyAkJHdyYXBfYWN0aW9uIGFzIGFjdGlvbiB9OwoyNzgAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IHsgYWN0aW9uIH1cbmNvbnN0IGFjdGlvbiA9IGFzeW5jICgpID0+ICdhY3Rpb24gY2FsbGVkJ1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsR0FBRyxDQUFDLE1BQU07OztBQUdYLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNOzs7In0=)

```js
'use server'


const action = async () => 'action called'
const $$wrap_action = /* #__PURE__ */ registerServerReference(action, "action");
export { $$wrap_action as action };
```

## module-export-effect

**Status:** transformed

**References:** action

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTE4ACd1c2Ugc2VydmVyJwoKZXhwb3J0IHsgYWN0aW9uIH0KY29uc3QgYWN0aW9uID0gYXN5bmMgKCkgPT4gJ2FjdGlvbiBjYWxsZWQnCgpyZWdpc3RlclNlcnZlclJlZmVyZW5jZShhY3Rpb24sICJhY3Rpb24iKTszMTIAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IHsgYWN0aW9uIH1cbmNvbnN0IGFjdGlvbiA9IGFzeW5jICgpID0+ICdhY3Rpb24gY2FsbGVkJ1xuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsR0FBRyxDQUFDLE1BQU07O0FBRVgsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDaEIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU07OyJ9)

```js
'use server'

export { action }
const action = async () => 'action called'

registerServerReference(action, "action");
```

## proxy-export

**Status:** transformed

**References:** action

[Source map visualization](https://evanw.github.io/source-map-visualization/#NzUACgpleHBvcnQgY29uc3QgYWN0aW9uID0gLyogI19fUFVSRV9fICovIGNyZWF0ZVNlcnZlclJlZmVyZW5jZSgiYWN0aW9uIik7CgoKMTYzAHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmV4cG9ydCB7IGFjdGlvbiB9XG5jb25zdCBhY3Rpb24gPSBhc3luYyAoKSA9PiAnYWN0aW9uIGNhbGxlZCdcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBOzs7In0=)

```js


export const action = /* #__PURE__ */ createServerReference("action");


```
