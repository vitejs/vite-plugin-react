## Input

```js
'use server'

export const action = async function actionImplementation() {
  return 'named function expression called'
}
```

## wrap-export

**Status:** transformed

**References:** action

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjAwACd1c2Ugc2VydmVyJwoKbGV0IGFjdGlvbiA9IGFzeW5jIGZ1bmN0aW9uIGFjdGlvbkltcGxlbWVudGF0aW9uKCkgewogIHJldHVybiAnbmFtZWQgZnVuY3Rpb24gZXhwcmVzc2lvbiBjYWxsZWQnCn0KYWN0aW9uID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKGFjdGlvbiwgImFjdGlvbiIpOwpleHBvcnQgeyBhY3Rpb24gfTsKMzg3AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmV4cG9ydCBjb25zdCBhY3Rpb24gPSBhc3luYyBmdW5jdGlvbiBhY3Rpb25JbXBsZW1lbnRhdGlvbigpIHtcbiAgcmV0dXJuICduYW1lZCBmdW5jdGlvbiBleHByZXNzaW9uIGNhbGxlZCdcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVKLEdBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO0FBQzVELENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxNQUFNO0FBQzFDO0FBRkE7QUFBQTsifQ==)

```js
'use server'

let action = async function actionImplementation() {
  return 'named function expression called'
}
action = /* #__PURE__ */ registerServerReference(action, "action");
export { action };
```

## module-export-effect

**Status:** transformed

**References:** action

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTc4ACd1c2Ugc2VydmVyJwoKY29uc3QgYWN0aW9uID0gYXN5bmMgZnVuY3Rpb24gYWN0aW9uSW1wbGVtZW50YXRpb24oKSB7CiAgcmV0dXJuICduYW1lZCBmdW5jdGlvbiBleHByZXNzaW9uIGNhbGxlZCcKfQoKcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoYWN0aW9uLCAiYWN0aW9uIik7CmV4cG9ydCB7IGFjdGlvbiB9OwozOTIAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IGNvbnN0IGFjdGlvbiA9IGFzeW5jIGZ1bmN0aW9uIGFjdGlvbkltcGxlbWVudGF0aW9uKCkge1xuICByZXR1cm4gJ25hbWVkIGZ1bmN0aW9uIGV4cHJlc3Npb24gY2FsbGVkJ1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsR0FBRyxDQUFDLE1BQU07O0FBRUosS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7QUFDNUQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU07QUFDMUM7QUFGQTtBQUFBO0FBQUE7In0=)

```js
'use server'

const action = async function actionImplementation() {
  return 'named function expression called'
}

registerServerReference(action, "action");
export { action };
```

## proxy-export

**Status:** transformed

**References:** action

[Source map visualization](https://evanw.github.io/source-map-visualization/#NzQACgpleHBvcnQgY29uc3QgYWN0aW9uID0gLyogI19fUFVSRV9fICovIGNyZWF0ZVNlcnZlclJlZmVyZW5jZSgiYWN0aW9uIik7CgoyMTAAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IGNvbnN0IGFjdGlvbiA9IGFzeW5jIGZ1bmN0aW9uIGFjdGlvbkltcGxlbWVudGF0aW9uKCkge1xuICByZXR1cm4gJ25hbWVkIGZ1bmN0aW9uIGV4cHJlc3Npb24gY2FsbGVkJ1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUE7OyJ9)

```js


export const action = /* #__PURE__ */ createServerReference("action");

```
