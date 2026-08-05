## Input

```js
const AI = {
  actions: {
    foo: async () => {
      'use server'
      return 0
    },
  },
}

export function ServerProvider() {
  return AI
}
```

## server action

**Status:** transformed

**References:** $$hoist_0_anonymous_server_function

```js
const AI = {
  actions: {
    foo: /* #__PURE__ */ $runtime($$hoist_0_anonymous_server_function, "<id>", "$$hoist_0_anonymous_server_function"),
  },
}

export function ServerProvider() {
  return AI
}

;export async function $$hoist_0_anonymous_server_function() {
      'use server'
      return 0
    };
/* #__PURE__ */ Object.defineProperty($$hoist_0_anonymous_server_function, "name", { value: "anonymous_server_function" });
```
