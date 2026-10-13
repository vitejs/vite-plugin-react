## Input

```js
'use server'

export /* before */ default /* after */ async function () {
  return 'default comments called'
}
```

## wrap-export

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjE3ACd1c2Ugc2VydmVyJwoKY29uc3QgJCRkZWZhdWx0ID0gYXN5bmMgZnVuY3Rpb24gKCkgewogIHJldHVybiAnZGVmYXVsdCBjb21tZW50cyBjYWxsZWQnCn0KY29uc3QgJCR3cmFwXyQkZGVmYXVsdCA9IC8qICNfX1BVUkVfXyAqLyByZWdpc3RlclNlcnZlclJlZmVyZW5jZSgkJGRlZmF1bHQsICJkZWZhdWx0Iik7CmV4cG9ydCB7ICQkd3JhcF8kJGRlZmF1bHQgYXMgZGVmYXVsdCB9OwozMjgAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IC8qIGJlZm9yZSAqLyBkZWZhdWx0IC8qIGFmdGVyICovIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICdkZWZhdWx0IGNvbW1lbnRzIGNhbGxlZCdcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVYLGtCQUF3QyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFELENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU07QUFDakM7OzsifQ==)

```js
'use server'

const $$default = async function () {
  return 'default comments called'
}
const $$wrap_$$default = /* #__PURE__ */ registerServerReference($$default, "default");
export { $$wrap_$$default as default };
```

## module-export-effect

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTg0ACd1c2Ugc2VydmVyJwoKY29uc3QgJCRlZmZlY3RfZGVmYXVsdCA9IGFzeW5jIGZ1bmN0aW9uICgpIHsKICByZXR1cm4gJ2RlZmF1bHQgY29tbWVudHMgY2FsbGVkJwp9CgpyZWdpc3RlclNlcnZlclJlZmVyZW5jZSgkJGVmZmVjdF9kZWZhdWx0LCAiZGVmYXVsdCIpOwpleHBvcnQgZGVmYXVsdCAkJGVmZmVjdF9kZWZhdWx0OwozNDEAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IC8qIGJlZm9yZSAqLyBkZWZhdWx0IC8qIGFmdGVyICovIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICdkZWZhdWx0IGNvbW1lbnRzIGNhbGxlZCdcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVMLHlCQUFrQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFELENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE1BQU07QUFDakM7QUFGQTtBQUFBO0FBQUE7In0=)

```js
'use server'

const $$effect_default = async function () {
  return 'default comments called'
}

registerServerReference($$effect_default, "default");
export default $$effect_default;
```

## proxy-export

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#NjgACgpleHBvcnQgZGVmYXVsdCAvKiAjX19QVVJFX18gKi8gY3JlYXRlU2VydmVyUmVmZXJlbmNlKCJkZWZhdWx0Iik7CgoxOTkAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IC8qIGJlZm9yZSAqLyBkZWZhdWx0IC8qIGFmdGVyICovIGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICdkZWZhdWx0IGNvbW1lbnRzIGNhbGxlZCdcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBOzsifQ==)

```js


export default /* #__PURE__ */ createServerReference("default");

```
