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

[Source map visualization](https://evanw.github.io/source-map-visualization/#ODM2AGNvbnN0IGtleSA9ICdjb21wdXRlZCcKCmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVPYmplY3QodmFsdWUpIHsKICByZXR1cm4gewogICAgW2dldEtleShrZXksIHZhbHVlKV06IC8qICNfX1BVUkVfXyAqLyByZWdpc3RlclNlcnZlclJlZmVyZW5jZSgkJGhvaXN0XzBfYW5vbnltb3VzX3NlcnZlcl9mdW5jdGlvbiwgIiQkaG9pc3RfMF9hbm9ueW1vdXNfc2VydmVyX2Z1bmN0aW9uIikuYmluZChudWxsLCBlbmNyeXB0KFt2YWx1ZV0pKSwKICB9Cn0KCmV4cG9ydCBjbGFzcyBBY3Rpb25zIHsKICBzdGF0aWMgYWN0aW9uID0gLyogI19fUFVSRV9fICovIHJlZ2lzdGVyU2VydmVyUmVmZXJlbmNlKCQkaG9pc3RfMV9hY3Rpb24sICIkJGhvaXN0XzFfYWN0aW9uIik7Cn0KCjtleHBvcnQgYXN5bmMgZnVuY3Rpb24gJCRob2lzdF8wX2Fub255bW91c19zZXJ2ZXJfZnVuY3Rpb24oJCRob2lzdF9lbmNvZGVkKSB7CiAgICAgIGNvbnN0IFt2YWx1ZV0gPSBhd2FpdCBkZWNyeXB0KCQkaG9pc3RfZW5jb2RlZCk7Cid1c2Ugc2VydmVyJwogICAgICByZXR1cm4gdmFsdWUKICAgIH07Ci8qICNfX1BVUkVfXyAqLyBPYmplY3QuZGVmaW5lUHJvcGVydHkoJCRob2lzdF8wX2Fub255bW91c19zZXJ2ZXJfZnVuY3Rpb24sICJuYW1lIiwgeyB2YWx1ZTogImFub255bW91c19zZXJ2ZXJfZnVuY3Rpb24iIH0pOwoKO2V4cG9ydCBhc3luYyBmdW5jdGlvbiAkJGhvaXN0XzFfYWN0aW9uKCkgewogICAgJ3VzZSBzZXJ2ZXInCiAgICByZXR1cm4gMQogIH07Ci8qICNfX1BVUkVfXyAqLyBPYmplY3QuZGVmaW5lUHJvcGVydHkoJCRob2lzdF8xX2FjdGlvbiwgIm5hbWUiLCB7IHZhbHVlOiAiYWN0aW9uIiB9KTsKODczAHsidmVyc2lvbiI6Mywic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3Qga2V5ID0gJ2NvbXB1dGVkJ1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlT2JqZWN0KHZhbHVlKSB7XG4gIHJldHVybiB7XG4gICAgYXN5bmMgW2dldEtleShrZXksIHZhbHVlKV0oKSB7XG4gICAgICAndXNlIHNlcnZlcidcbiAgICAgIHJldHVybiB2YWx1ZVxuICAgIH0sXG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEFjdGlvbnMge1xuICBzdGF0aWMgYXN5bmMgYWN0aW9uKCkge1xuICAgICd1c2Ugc2VydmVyJ1xuICAgIHJldHVybiAxXG4gIH1cbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7O0FBRXJCLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxtSkFHeEI7QUFDTCxDQUFDLENBQUM7QUFDRjs7QUFFQSxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQztBQUNyQixDQUFDLENBQUMsT0FBYTtBQUlmO0FBWjhCO0FBQUEsNEVBQUc7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTTtBQUNqQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDYixDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUtpQjtBQUFBLDBDQUFHO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTTtBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ1gsQ0FBQyxDQUFDOzsifQ==)

```js
const key = 'computed'

export function createObject(value) {
  return {
    [getKey(key, value)]: /* #__PURE__ */ registerServerReference($$hoist_0_anonymous_server_function, "$$hoist_0_anonymous_server_function").bind(null, encrypt([value])),
  }
}

export class Actions {
  static action = /* #__PURE__ */ registerServerReference($$hoist_1_action, "$$hoist_1_action");
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
