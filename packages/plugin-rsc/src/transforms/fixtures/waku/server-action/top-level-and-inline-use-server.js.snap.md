## Input

```js
'use server'

async function innerAction(action, ...args) {
  'use server'
  return await action(...args)
}

function wrapAction(action) {
  return innerAction.bind(null, action)
}

export async function exportedAction() {
  'use server'
  return null
}

export default async () => null
```

## server action

**Status:** transformed

**References:** exportedAction, default

```js
'use server'

async function innerAction(action, ...args) {
  'use server'
  return await action(...args)
}

function wrapAction(action) {
  return innerAction.bind(null, action)
}

async function exportedAction() {
  'use server'
  return null
}

const $$effect_default = async () => null

$runtime(exportedAction, "<id>", "exportedAction");
export { exportedAction };

$runtime($$effect_default, "<id>", "default");
export default $$effect_default;
```
