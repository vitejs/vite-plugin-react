## Input

```js
'use server'

export default async function () {
  return 'default anonymous function called'
}
```

## wrap-export

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjI5ACd1c2Ugc2VydmVyJwoKY29uc3QgJCRkZWZhdWx0ID0gYXN5bmMgZnVuY3Rpb24gKCkgewogIHJldHVybiAnZGVmYXVsdCBhbm9ueW1vdXMgZnVuY3Rpb24gY2FsbGVkJwp9CjsKY29uc3QgJCR3cmFwXyQkZGVmYXVsdCA9IC8qICNfX1BVUkVfXyAqLyByZWdpc3RlclNlcnZlclJlZmVyZW5jZSgkJGRlZmF1bHQsICJkZWZhdWx0Iik7CmV4cG9ydCB7ICQkd3JhcF8kJGRlZmF1bHQgYXMgZGVmYXVsdCB9OwozMjMAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJ2RlZmF1bHQgYW5vbnltb3VzIGZ1bmN0aW9uIGNhbGxlZCdcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVYLGtCQUFlLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU07QUFDM0M7Ozs7In0=)

```js
'use server'

const $$default = async function () {
  return 'default anonymous function called'
}
;
const $$wrap_$$default = /* #__PURE__ */ registerServerReference($$default, "default");
export { $$wrap_$$default as default };
```

## module-export-effect

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#MTk0ACd1c2Ugc2VydmVyJwoKY29uc3QgJCRlZmZlY3RfZGVmYXVsdCA9IGFzeW5jIGZ1bmN0aW9uICgpIHsKICByZXR1cm4gJ2RlZmF1bHQgYW5vbnltb3VzIGZ1bmN0aW9uIGNhbGxlZCcKfQoKcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoJCRlZmZlY3RfZGVmYXVsdCwgImRlZmF1bHQiKTsKZXhwb3J0IGRlZmF1bHQgJCRlZmZlY3RfZGVmYXVsdDsKMzM1AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuICdkZWZhdWx0IGFub255bW91cyBmdW5jdGlvbiBjYWxsZWQnXG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxHQUFHLENBQUMsTUFBTTs7QUFFTCx5QkFBUyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxNQUFNO0FBQzNDO0FBRkE7QUFBQTtBQUFBOyJ9)

```js
'use server'

const $$effect_default = async function () {
  return 'default anonymous function called'
}

registerServerReference($$effect_default, "default");
export default $$effect_default;
```

## proxy-export

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#NjgACgpleHBvcnQgZGVmYXVsdCAvKiAjX19QVVJFX18gKi8gY3JlYXRlU2VydmVyUmVmZXJlbmNlKCJkZWZhdWx0Iik7CgoxODQAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gKCkge1xuICByZXR1cm4gJ2RlZmF1bHQgYW5vbnltb3VzIGZ1bmN0aW9uIGNhbGxlZCdcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBOzsifQ==)

```js


export default /* #__PURE__ */ createServerReference("default");

```
