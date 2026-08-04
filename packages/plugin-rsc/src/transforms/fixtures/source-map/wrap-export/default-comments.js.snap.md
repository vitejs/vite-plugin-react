## Input

```js
'use server'

export default /* before */ /* after */ async function () {
  return 'default comments called'
}
```

## wrap-export

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjE5ACd1c2Ugc2VydmVyJwoKY29uc3QgJCRkZWZhdWx0ID0gYXN5bmMgZnVuY3Rpb24gKCkgewogIHJldHVybiAnZGVmYXVsdCBjb21tZW50cyBjYWxsZWQnCn0KOwpjb25zdCAkJHdyYXBfJCRkZWZhdWx0ID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKCQkZGVmYXVsdCwgImRlZmF1bHQiKTsKZXhwb3J0IHsgJCR3cmFwXyQkZGVmYXVsdCBhcyBkZWZhdWx0IH07CjMyOQB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJ1xuXG5leHBvcnQgZGVmYXVsdCAvKiBiZWZvcmUgKi8gLyogYWZ0ZXIgKi8gYXN5bmMgZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJ2RlZmF1bHQgY29tbWVudHMgY2FsbGVkJ1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsR0FBRyxDQUFDLE1BQU07O0FBRVgsa0JBQXdDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTTtBQUNqQzs7OzsifQ==)

```js
'use server'

const $$default = async function () {
  return 'default comments called'
}
;
const $$wrap_$$default = /* #__PURE__ */ registerServerReference($$default, "default");
export { $$wrap_$$default as default };
```

## module-export-effect

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTg0ACd1c2Ugc2VydmVyJwoKY29uc3QgJCRlZmZlY3RfZGVmYXVsdCA9IGFzeW5jIGZ1bmN0aW9uICgpIHsKICByZXR1cm4gJ2RlZmF1bHQgY29tbWVudHMgY2FsbGVkJwp9CgpyZWdpc3RlclNlcnZlclJlZmVyZW5jZSgkJGVmZmVjdF9kZWZhdWx0LCAiZGVmYXVsdCIpOwpleHBvcnQgZGVmYXVsdCAkJGVmZmVjdF9kZWZhdWx0OwozNDEAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IGRlZmF1bHQgLyogYmVmb3JlICovIC8qIGFmdGVyICovIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICdkZWZhdWx0IGNvbW1lbnRzIGNhbGxlZCdcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVMLHlCQUFrQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFELENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU07QUFDakM7QUFGQTtBQUFBO0FBQUE7In0=)

```js
'use server'

const $$effect_default = async function () {
  return 'default comments called'
}

registerServerReference($$effect_default, "default");
export default $$effect_default;
```

## module-export-wrap

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#MzM5ACd1c2Ugc2VydmVyJwoKY29uc3QgJCRtb2R1bGVfMF9pbXBsZW1lbnRhdGlvbl9kZWZhdWx0ID0gYXN5bmMgZnVuY3Rpb24gKCkgewogIHJldHVybiAnZGVmYXVsdCBjb21tZW50cyBjYWxsZWQnCn0KCmNvbnN0ICQkbW9kdWxlXzBfYmluZGluZ19kZWZhdWx0ID0gLyogI19fUFVSRV9fICovIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZWdpc3RlclNlcnZlclJlZmVyZW5jZSgkJG1vZHVsZV8wX2ltcGxlbWVudGF0aW9uX2RlZmF1bHQsICJkZWZhdWx0IiksICJuYW1lIiwgeyB2YWx1ZTogImRlZmF1bHQiIH0pOwpleHBvcnQgeyAkJG1vZHVsZV8wX2JpbmRpbmdfZGVmYXVsdCBhcyBkZWZhdWx0IH07CjMyOQB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJ1xuXG5leHBvcnQgZGVmYXVsdCAvKiBiZWZvcmUgKi8gLyogYWZ0ZXIgKi8gYXN5bmMgZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJ2RlZmF1bHQgY29tbWVudHMgY2FsbGVkJ1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLENBQUMsR0FBRyxDQUFDLE1BQU07O0FBRVgsMENBQXdDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTTtBQUNqQzs7OzsifQ==)

```js
'use server'

const $$module_0_implementation_default = async function () {
  return 'default comments called'
}

const $$module_0_binding_default = /* #__PURE__ */ Object.defineProperty(registerServerReference($$module_0_implementation_default, "default"), "name", { value: "default" });
export { $$module_0_binding_default as default };
```
