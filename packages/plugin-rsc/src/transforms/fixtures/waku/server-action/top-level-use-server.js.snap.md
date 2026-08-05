## Input

```js
'use server'

const privateFunction = () => 'Secret'

export const log = async (mesg) => {
  console.log('%s', mesg)
}

export async function greet(name) {
  return 'Hello ' + name
}

export default async function () {
  return Date.now()
}
```

## server action

**Status:** transformed

**References:** log, greet, default

```js
'use server'

const privateFunction = () => 'Secret'

const log = async (mesg) => {
  console.log('%s', mesg)
}

async function greet(name) {
  return 'Hello ' + name
}

const $$effect_default = async function () {
  return Date.now()
}

$runtime(log, "<id>", "log");
export { log };

$runtime(greet, "<id>", "greet");
export { greet };

$runtime($$effect_default, "<id>", "default");
export default $$effect_default;
```
