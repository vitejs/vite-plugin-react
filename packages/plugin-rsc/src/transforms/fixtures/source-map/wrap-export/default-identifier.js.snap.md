## Input

```js
'use server'

async function defaultIdentifier() {
  return 'default identifier called'
}

export default defaultIdentifier
```

## wrap-export

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjU3ACd1c2Ugc2VydmVyJwoKYXN5bmMgZnVuY3Rpb24gZGVmYXVsdElkZW50aWZpZXIoKSB7CiAgcmV0dXJuICdkZWZhdWx0IGlkZW50aWZpZXIgY2FsbGVkJwp9Cgpjb25zdCAkJGRlZmF1bHQgPSBkZWZhdWx0SWRlbnRpZmllcgo7CmNvbnN0ICQkd3JhcF8kJGRlZmF1bHQgPSAvKiAjX19QVVJFX18gKi8gcmVnaXN0ZXJTZXJ2ZXJSZWZlcmVuY2UoJCRkZWZhdWx0LCAiZGVmYXVsdCIpOwpleHBvcnQgeyAkJHdyYXBfJCRkZWZhdWx0IGFzIGRlZmF1bHQgfTsKMzU2AHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzZXJ2ZXInXG5cbmFzeW5jIGZ1bmN0aW9uIGRlZmF1bHRJZGVudGlmaWVyKCkge1xuICByZXR1cm4gJ2RlZmF1bHQgaWRlbnRpZmllciBjYWxsZWQnXG59XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmF1bHRJZGVudGlmaWVyXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxHQUFHLENBQUMsTUFBTTs7QUFFWCxLQUFLLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztBQUNuQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNO0FBQ25DOztBQUVBLGtCQUFlOzs7OyJ9)

```js
'use server'

async function defaultIdentifier() {
  return 'default identifier called'
}

const $$default = defaultIdentifier
;
const $$wrap_$$default = /* #__PURE__ */ registerServerReference($$default, "default");
export { $$wrap_$$default as default };
```

## module-export-effect

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#MjIzACd1c2Ugc2VydmVyJwoKYXN5bmMgZnVuY3Rpb24gZGVmYXVsdElkZW50aWZpZXIoKSB7CiAgcmV0dXJuICdkZWZhdWx0IGlkZW50aWZpZXIgY2FsbGVkJwp9Cgpjb25zdCAkJGVmZmVjdF9kZWZhdWx0ID0gZGVmYXVsdElkZW50aWZpZXI7CgpyZWdpc3RlclNlcnZlclJlZmVyZW5jZSgkJGVmZmVjdF9kZWZhdWx0LCAiZGVmYXVsdCIpOwpleHBvcnQgZGVmYXVsdCAkJGVmZmVjdF9kZWZhdWx0OwozNjIAeyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHNlcnZlcidcblxuYXN5bmMgZnVuY3Rpb24gZGVmYXVsdElkZW50aWZpZXIoKSB7XG4gIHJldHVybiAnZGVmYXVsdCBpZGVudGlmaWVyIGNhbGxlZCdcbn1cblxuZXhwb3J0IGRlZmF1bHQgZGVmYXVsdElkZW50aWZpZXJcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLEdBQUcsQ0FBQyxNQUFNOztBQUVYLEtBQUssQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU07QUFDbkM7O0FBRU07QUFBTjtBQUFBO0FBQUE7In0=)

```js
'use server'

async function defaultIdentifier() {
  return 'default identifier called'
}

const $$effect_default = defaultIdentifier;

registerServerReference($$effect_default, "default");
export default $$effect_default;
```

## proxy-export

**Status:** transformed

**References:** default

[Source map visualization](https://evanw.github.io/source-map-visualization/#NzAACgoKCmV4cG9ydCBkZWZhdWx0IC8qICNfX1BVUkVfXyAqLyBjcmVhdGVTZXJ2ZXJSZWZlcmVuY2UoImRlZmF1bHQiKTsKCjIxNgB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc2VydmVyJ1xuXG5hc3luYyBmdW5jdGlvbiBkZWZhdWx0SWRlbnRpZmllcigpIHtcbiAgcmV0dXJuICdkZWZhdWx0IGlkZW50aWZpZXIgY2FsbGVkJ1xufVxuXG5leHBvcnQgZGVmYXVsdCBkZWZhdWx0SWRlbnRpZmllclxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFNQTs7In0=)

```js




export default /* #__PURE__ */ createServerReference("default");

```
