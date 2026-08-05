## Input

```js
const now = Date.now()
export default function App() {
  return (mesg) => {
    'use server'
    console.log('%s', mesg, now)
  }
}
```

## server action

**Status:** transformed

**References:** $$hoist_0_anonymous_server_function

```js
const now = Date.now()
export default function App() {
  return /* #__PURE__ */ $runtime($$hoist_0_anonymous_server_function, "<id>", "$$hoist_0_anonymous_server_function")
}

;export function $$hoist_0_anonymous_server_function(mesg) {
    'use server'
    console.log('%s', mesg, now)
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_anonymous_server_function, "name", { value: "anonymous_server_function" });
```
