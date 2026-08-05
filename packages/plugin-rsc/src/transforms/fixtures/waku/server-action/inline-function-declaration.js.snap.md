## Input

```js
export default function App() {
  const a = 'test'
  async function log(mesg) {
    'use server'
    console.log('%s', mesg, a)
  }
  return log
}
```

## server action

**Status:** transformed

**References:** $$hoist_0_log

```js
export default function App() {
  const a = 'test'
  const log = /* #__PURE__ */ $runtime($$hoist_0_log, "<id>", "$$hoist_0_log").bind(null, a);
  return log
}

;export async function $$hoist_0_log(a, mesg) {
    'use server'
    console.log('%s', mesg, a)
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_log, "name", { value: "log" });
```
