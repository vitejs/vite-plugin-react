## Input

```js
export default function App() {
  const rand = Math.random()
  const log = async function (mesg) {
    'use server'
    console.log('%s', mesg, rand)
  }
  return log
}
```

## server action

**Status:** transformed

**References:** $$hoist_0_log

```js
export default function App() {
  const rand = Math.random()
  const log = /* #__PURE__ */ $runtime($$hoist_0_log, "<id>", "$$hoist_0_log").bind(null, rand)
  return log
}

;export async function $$hoist_0_log(rand, mesg) {
    'use server'
    console.log('%s', mesg, rand)
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_log, "name", { value: "log" });
```
