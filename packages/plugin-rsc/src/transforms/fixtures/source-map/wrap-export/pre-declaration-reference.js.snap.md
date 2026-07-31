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

## module-export

**Status:** transformed

**References:** action

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTgwACd1c2Ugc2VydmVyJwoKdm9pZCBhY3Rpb24KCmFzeW5jIGZ1bmN0aW9uIGFjdGlvbiQkaW1wbCgpIHsKICByZXR1cm4gJ2FjdGlvbiBjYWxsZWQnCn0KY29uc3QgYWN0aW9uID0gcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoYWN0aW9uJCRpbXBsLCAiYWN0aW9uIik7CmV4cG9ydCB7IGFjdGlvbiBhcyBhY3Rpb24gfTsKCjMxMQB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJ1xuXG52b2lkIGFjdGlvblxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWN0aW9uKCkge1xuICByZXR1cm4gJ2FjdGlvbiBjYWxsZWQnXG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxHQUFHLENBQUMsTUFBTTs7QUFFWCxJQUFJLENBQUM7O0FBRUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxZQUFNLENBQUMsQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTTtBQUN2Qjs7OzsifQ==)

```js
'use server'

void action

async function action$$impl() {
  return 'action called'
}
const action = registerServerReference(action$$impl, "action");
export { action as action };

```

## module-export-effect

**Status:** transformed

**References:** action

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTMxACd1c2Ugc2VydmVyJwoKdm9pZCBhY3Rpb24KCmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhY3Rpb24oKSB7CiAgcmV0dXJuICdhY3Rpb24gY2FsbGVkJwp9CgpyZWdpc3RlclNlcnZlclJlZmVyZW5jZShhY3Rpb24sICJhY3Rpb24iKTsKMzIwAHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbnZvaWQgYWN0aW9uXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhY3Rpb24oKSB7XG4gIHJldHVybiAnYWN0aW9uIGNhbGxlZCdcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVYLElBQUksQ0FBQzs7QUFFTCxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTTtBQUN2Qjs7OyJ9)

```js
'use server'

void action

export async function action() {
  return 'action called'
}

registerServerReference(action, "action");
```

## module-export-hoist

**Status:** transformed

**References:** action

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjkxACd1c2Ugc2VydmVyJwoKdm9pZCBhY3Rpb24KCmV4cG9ydCBjb25zdCBhY3Rpb24gPSAvKiAjX19QVVJFX18gKi8gcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoJCRtb2R1bGVfaG9pc3RfMF9hY3Rpb24sICJhY3Rpb24iKTsKCjthc3luYyBmdW5jdGlvbiAkJG1vZHVsZV9ob2lzdF8wX2FjdGlvbigpIHsKICByZXR1cm4gJ2FjdGlvbiBjYWxsZWQnCn07Ci8qICNfX1BVUkVfXyAqLyBPYmplY3QuZGVmaW5lUHJvcGVydHkoJCRtb2R1bGVfaG9pc3RfMF9hY3Rpb24sICJuYW1lIiwgeyB2YWx1ZTogImFjdGlvbiIgfSk7CjI5MQB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJ1xuXG52b2lkIGFjdGlvblxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWN0aW9uKCkge1xuICByZXR1cm4gJ2FjdGlvbiBjYWxsZWQnXG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxHQUFHLENBQUMsTUFBTTs7QUFFWCxJQUFJLENBQUM7O0FBRUwsTUFBTTtBQUFDO0FBQUEsMENBQXdCO0FBQy9CLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTTtBQUN2Qjs7In0=)

```js
'use server'

void action

export const action = /* #__PURE__ */ registerServerReference($$module_hoist_0_action, "action");

;async function $$module_hoist_0_action() {
  return 'action called'
};
/* #__PURE__ */ Object.defineProperty($$module_hoist_0_action, "name", { value: "action" });
```
