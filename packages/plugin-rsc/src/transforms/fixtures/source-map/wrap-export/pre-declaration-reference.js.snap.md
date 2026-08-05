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

## proxy-export

**Status:** transformed

**References:** action

[Source map visualization](https://evanw.github.io/source-map-visualization/#NzYACgoKCmV4cG9ydCBjb25zdCBhY3Rpb24gPSAvKiAjX19QVVJFX18gKi8gY3JlYXRlU2VydmVyUmVmZXJlbmNlKCJhY3Rpb24iKTsKCjE3OQB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJ1xuXG52b2lkIGFjdGlvblxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWN0aW9uKCkge1xuICByZXR1cm4gJ2FjdGlvbiBjYWxsZWQnXG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUlBOzsifQ==)

```js




export const action = /* #__PURE__ */ createServerReference("action");

```
