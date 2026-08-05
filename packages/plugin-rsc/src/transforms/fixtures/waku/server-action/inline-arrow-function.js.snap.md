## Input

```js
const now = Date.now()
export default function App() {
  const log = async (mesg) => {
    'use server'
    console.log('%s', mesg, now)
  }
  return log
}
```

## server action

**Status:** transformed

**References:** $$hoist_0_log

```js
const now = Date.now()
export default function App() {
  const log = /* #__PURE__ */ $runtime($$hoist_0_log, "<id>", "$$hoist_0_log")
  return log
}

;export async function $$hoist_0_log(mesg) {
    'use server'
    console.log('%s', mesg, now)
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_log, "name", { value: "log" });
```
