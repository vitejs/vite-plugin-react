## Input

```js
const key = 'computed'

export function createObject(value) {
  return {
    async [key]() {
      'use server'
      return value
    },
  }
}

export class Actions {
  static async action() {
    'use server'
    return 1
  }
}
```

## hoist

**Status:** transformed

**References:** $$hoist_0_key, $$hoist_1_action

[Source map visualization](https://evanw.github.io/source-map-visualization/#NzExAGNvbnN0IGtleSA9ICdjb21wdXRlZCcKCmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVPYmplY3QodmFsdWUpIHsKICByZXR1cm4gewogICAgW2tleV06IC8qICNfX1BVUkVfXyAqLyByZWdpc3RlclNlcnZlclJlZmVyZW5jZSgkJGhvaXN0XzBfa2V5LCAiJCRob2lzdF8wX2tleSIpLmJpbmQobnVsbCwgZW5jcnlwdChbdmFsdWVdKSksCiAgfQp9CgpleHBvcnQgY2xhc3MgQWN0aW9ucyB7CiAgc3RhdGljIGFjdGlvbiA9IC8qICNfX1BVUkVfXyAqLyByZWdpc3RlclNlcnZlclJlZmVyZW5jZSgkJGhvaXN0XzFfYWN0aW9uLCAiJCRob2lzdF8xX2FjdGlvbiIpOwp9Cgo7ZXhwb3J0IGFzeW5jIGZ1bmN0aW9uICQkaG9pc3RfMF9rZXkoJCRob2lzdF9lbmNvZGVkKSB7CiAgICAgIGNvbnN0IFt2YWx1ZV0gPSBhd2FpdCBkZWNyeXB0KCQkaG9pc3RfZW5jb2RlZCk7Cid1c2Ugc2VydmVyJwogICAgICByZXR1cm4gdmFsdWUKICAgIH07Ci8qICNfX1BVUkVfXyAqLyBPYmplY3QuZGVmaW5lUHJvcGVydHkoJCRob2lzdF8wX2tleSwgIm5hbWUiLCB7IHZhbHVlOiAia2V5IiB9KTsKCjtleHBvcnQgYXN5bmMgZnVuY3Rpb24gJCRob2lzdF8xX2FjdGlvbigpIHsKICAgICd1c2Ugc2VydmVyJwogICAgcmV0dXJuIDEKICB9OwovKiAjX19QVVJFX18gKi8gT2JqZWN0LmRlZmluZVByb3BlcnR5KCQkaG9pc3RfMV9hY3Rpb24sICJuYW1lIiwgeyB2YWx1ZTogImFjdGlvbiIgfSk7CjgxMQB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGtleSA9ICdjb21wdXRlZCdcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU9iamVjdCh2YWx1ZSkge1xuICByZXR1cm4ge1xuICAgIGFzeW5jIFtrZXldKCkge1xuICAgICAgJ3VzZSBzZXJ2ZXInXG4gICAgICByZXR1cm4gdmFsdWVcbiAgICB9LFxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBBY3Rpb25zIHtcbiAgc3RhdGljIGFzeW5jIGFjdGlvbigpIHtcbiAgICAndXNlIHNlcnZlcidcbiAgICByZXR1cm4gMVxuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFROztBQUVyQixNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNwQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQywyR0FHQztBQUNMLENBQUMsQ0FBQztBQUNGOztBQUVBLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO0FBQ3JCLENBQUMsQ0FBQztBQUlGO0FBWmU7QUFBQSxzREFBRztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNiLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBS2lCO0FBQUEsMENBQUc7QUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNO0FBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDWCxDQUFDLENBQUM7OyJ9)

```js
const key = 'computed'

export function createObject(value) {
  return {
    [key]: /* #__PURE__ */ registerServerReference($$hoist_0_key, "$$hoist_0_key").bind(null, encrypt([value])),
  }
}

export class Actions {
  static action = /* #__PURE__ */ registerServerReference($$hoist_1_action, "$$hoist_1_action");
}

;export async function $$hoist_0_key($$hoist_encoded) {
      const [value] = await decrypt($$hoist_encoded);
'use server'
      return value
    };
/* #__PURE__ */ Object.defineProperty($$hoist_0_key, "name", { value: "key" });

;export async function $$hoist_1_action() {
    'use server'
    return 1
  };
/* #__PURE__ */ Object.defineProperty($$hoist_1_action, "name", { value: "action" });
```
