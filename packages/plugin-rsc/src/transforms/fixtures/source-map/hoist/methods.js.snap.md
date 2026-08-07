## Input

```js
const key = 'computed'

export function createObject(value) {
  return {
    async [getKey(key, value)]() {
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

**References:** $$hoist_0_anonymous_server_function, $$hoist_1_action

[Source map visualization](https://evanw.github.io/source-map-visualization/#ODQwAGNvbnN0IGtleSA9ICdjb21wdXRlZCcKCmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVPYmplY3QodmFsdWUpIHsKICByZXR1cm4gewogICAgW2dldEtleShrZXksIHZhbHVlKV06IC8qICNfX1BVUkVfXyAqLyByZWdpc3RlclNlcnZlclJlZmVyZW5jZSgkJGhvaXN0XzBfYW5vbnltb3VzX3NlcnZlcl9mdW5jdGlvbiwgIiQkaG9pc3RfMF9hbm9ueW1vdXNfc2VydmVyX2Z1bmN0aW9uIikuYmluZChudWxsLCBlbmNyeXB0KFt2YWx1ZV0pKSwKICB9Cn0KCmV4cG9ydCBjbGFzcyBBY3Rpb25zIHsKICBzdGF0aWMgWyJhY3Rpb24iXSA9IC8qICNfX1BVUkVfXyAqLyByZWdpc3RlclNlcnZlclJlZmVyZW5jZSgkJGhvaXN0XzFfYWN0aW9uLCAiJCRob2lzdF8xX2FjdGlvbiIpOwp9Cgo7ZXhwb3J0IGFzeW5jIGZ1bmN0aW9uICQkaG9pc3RfMF9hbm9ueW1vdXNfc2VydmVyX2Z1bmN0aW9uKCQkaG9pc3RfZW5jb2RlZCkgewogICAgICBjb25zdCBbdmFsdWVdID0gYXdhaXQgZGVjcnlwdCgkJGhvaXN0X2VuY29kZWQpOwondXNlIHNlcnZlcicKICAgICAgcmV0dXJuIHZhbHVlCiAgICB9OwovKiAjX19QVVJFX18gKi8gT2JqZWN0LmRlZmluZVByb3BlcnR5KCQkaG9pc3RfMF9hbm9ueW1vdXNfc2VydmVyX2Z1bmN0aW9uLCAibmFtZSIsIHsgdmFsdWU6ICJhbm9ueW1vdXNfc2VydmVyX2Z1bmN0aW9uIiB9KTsKCjtleHBvcnQgYXN5bmMgZnVuY3Rpb24gJCRob2lzdF8xX2FjdGlvbigpIHsKICAgICd1c2Ugc2VydmVyJwogICAgcmV0dXJuIDEKICB9OwovKiAjX19QVVJFX18gKi8gT2JqZWN0LmRlZmluZVByb3BlcnR5KCQkaG9pc3RfMV9hY3Rpb24sICJuYW1lIiwgeyB2YWx1ZTogImFjdGlvbiIgfSk7CjgyNwB7InZlcnNpb24iOjMsInNvdXJjZXMiOlsiIl0sInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGtleSA9ICdjb21wdXRlZCdcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU9iamVjdCh2YWx1ZSkge1xuICByZXR1cm4ge1xuICAgIGFzeW5jIFtnZXRLZXkoa2V5LCB2YWx1ZSldKCkge1xuICAgICAgJ3VzZSBzZXJ2ZXInXG4gICAgICByZXR1cm4gdmFsdWVcbiAgICB9LFxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBBY3Rpb25zIHtcbiAgc3RhdGljIGFzeW5jIGFjdGlvbigpIHtcbiAgICAndXNlIHNlcnZlcidcbiAgICByZXR1cm4gMVxuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFROztBQUVyQixNQUFNLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNwQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxzS0FHQztBQUNMLENBQUMsQ0FBQztBQUNGOztBQUVBLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO0FBQ3JCLENBQUMsQ0FBQztBQUlGO0FBWjhCO0FBQUEsNEVBQUc7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTTtBQUNqQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDYixDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUtpQjtBQUFBLDBDQUFHO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTTtBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ1gsQ0FBQyxDQUFDOzsifQ==)

```js
const key = 'computed'

export function createObject(value) {
  return {
    [getKey(key, value)]: /* #__PURE__ */ registerServerReference($$hoist_0_anonymous_server_function, "$$hoist_0_anonymous_server_function").bind(null, encrypt([value])),
  }
}

export class Actions {
  static ["action"] = /* #__PURE__ */ registerServerReference($$hoist_1_action, "$$hoist_1_action");
}

;export async function $$hoist_0_anonymous_server_function($$hoist_encoded) {
      const [value] = await decrypt($$hoist_encoded);
'use server'
      return value
    };
/* #__PURE__ */ Object.defineProperty($$hoist_0_anonymous_server_function, "name", { value: "anonymous_server_function" });

;export async function $$hoist_1_action() {
    'use server'
    return 1
  };
/* #__PURE__ */ Object.defineProperty($$hoist_1_action, "name", { value: "action" });
```
