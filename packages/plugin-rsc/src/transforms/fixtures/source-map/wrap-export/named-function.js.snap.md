## Input

```js
'use server'

export async function namedFunction() {
  return 'named function called'
}
```

## wrap-export

**Status:** transformed

**References:** namedFunction

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTk3ACd1c2Ugc2VydmVyJwoKYXN5bmMgZnVuY3Rpb24gbmFtZWRGdW5jdGlvbigpIHsKICByZXR1cm4gJ25hbWVkIGZ1bmN0aW9uIGNhbGxlZCcKfQpuYW1lZEZ1bmN0aW9uID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKG5hbWVkRnVuY3Rpb24sICJuYW1lZEZ1bmN0aW9uIik7CmV4cG9ydCB7IG5hbWVkRnVuY3Rpb24gfTsKMzEyAHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBuYW1lZEZ1bmN0aW9uKCkge1xuICByZXR1cm4gJ25hbWVkIGZ1bmN0aW9uIGNhbGxlZCdcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVKLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNO0FBQy9CO0FBRkE7QUFBQTsifQ==)

```js
'use server'

async function namedFunction() {
  return 'named function called'
}
namedFunction = /* #__PURE__ */ registerServerReference(namedFunction, "namedFunction");
export { namedFunction };
```

## module-export-effect

**Status:** transformed

**References:** namedFunction

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTY2ACd1c2Ugc2VydmVyJwoKYXN5bmMgZnVuY3Rpb24gbmFtZWRGdW5jdGlvbigpIHsKICByZXR1cm4gJ25hbWVkIGZ1bmN0aW9uIGNhbGxlZCcKfQoKcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UobmFtZWRGdW5jdGlvbiwgIm5hbWVkRnVuY3Rpb24iKTsKZXhwb3J0IHsgbmFtZWRGdW5jdGlvbiB9OwozMTcAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG5hbWVkRnVuY3Rpb24oKSB7XG4gIHJldHVybiAnbmFtZWQgZnVuY3Rpb24gY2FsbGVkJ1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsR0FBRyxDQUFDLE1BQU07O0FBRUosS0FBSyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU07QUFDL0I7QUFGQTtBQUFBO0FBQUE7In0=)

```js
'use server'

async function namedFunction() {
  return 'named function called'
}

registerServerReference(namedFunction, "namedFunction");
export { namedFunction };
```

## module-export-wrap

**Status:** transformed

**References:** namedFunction

[Source map visualization](https://evanw.github.io/source-map-visualization/#MzE4ACd1c2Ugc2VydmVyJwoKYXN5bmMgZnVuY3Rpb24gbmFtZWRGdW5jdGlvbigpIHsKICByZXR1cm4gJ25hbWVkIGZ1bmN0aW9uIGNhbGxlZCcKfQoKY29uc3QgJCRtb2R1bGVfMF9iaW5kaW5nX25hbWVkRnVuY3Rpb24gPSAvKiAjX19QVVJFX18gKi8gT2JqZWN0LmRlZmluZVByb3BlcnR5KHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKG5hbWVkRnVuY3Rpb24sICJuYW1lZEZ1bmN0aW9uIiksICJuYW1lIiwgeyB2YWx1ZTogIm5hbWVkRnVuY3Rpb24iIH0pOwpleHBvcnQgeyAkJG1vZHVsZV8wX2JpbmRpbmdfbmFtZWRGdW5jdGlvbiBhcyBuYW1lZEZ1bmN0aW9uIH07CjMwNQB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJ1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbmFtZWRGdW5jdGlvbigpIHtcbiAgcmV0dXJuICduYW1lZCBmdW5jdGlvbiBjYWxsZWQnXG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxHQUFHLENBQUMsTUFBTTs7QUFFSixLQUFLLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7QUFDdEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTTtBQUMvQjs7OzsifQ==)

```js
'use server'

async function namedFunction() {
  return 'named function called'
}

const $$module_0_binding_namedFunction = /* #__PURE__ */ Object.defineProperty(registerServerReference(namedFunction, "namedFunction"), "name", { value: "namedFunction" });
export { $$module_0_binding_namedFunction as namedFunction };
```
