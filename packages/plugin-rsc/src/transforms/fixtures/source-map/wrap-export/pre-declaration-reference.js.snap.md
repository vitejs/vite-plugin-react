## Input

```js
'use server'

void action

export async function action() {
  return 'action called'
}
```

## wrap-export

**Status:** transformed

**References:** action

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTY3ACd1c2Ugc2VydmVyJwoKdm9pZCBhY3Rpb24KCmFzeW5jIGZ1bmN0aW9uIGFjdGlvbigpIHsKICByZXR1cm4gJ2FjdGlvbiBjYWxsZWQnCn0KYWN0aW9uID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKGFjdGlvbiwgImFjdGlvbiIpOwpleHBvcnQgeyBhY3Rpb24gfTsKMzE4AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbnZvaWQgYWN0aW9uXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhY3Rpb24oKSB7XG4gIHJldHVybiAnYWN0aW9uIGNhbGxlZCdcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVYLElBQUksQ0FBQzs7QUFFRSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNO0FBQ3ZCO0FBRkE7QUFBQTsifQ==)

```js
'use server'

void action

async function action() {
  return 'action called'
}
action = /* #__PURE__ */ registerServerReference(action, "action");
export { action };
```

## module-export-effect

**Status:** transformed

**References:** action

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTQzACd1c2Ugc2VydmVyJwoKdm9pZCBhY3Rpb24KCmFzeW5jIGZ1bmN0aW9uIGFjdGlvbigpIHsKICByZXR1cm4gJ2FjdGlvbiBjYWxsZWQnCn0KCnJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKGFjdGlvbiwgImFjdGlvbiIpOwpleHBvcnQgeyBhY3Rpb24gfTsKMzIzAHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbnZvaWQgYWN0aW9uXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhY3Rpb24oKSB7XG4gIHJldHVybiAnYWN0aW9uIGNhbGxlZCdcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVYLElBQUksQ0FBQzs7QUFFRSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNO0FBQ3ZCO0FBRkE7QUFBQTtBQUFBOyJ9)

```js
'use server'

void action

async function action() {
  return 'action called'
}

registerServerReference(action, "action");
export { action };
```
