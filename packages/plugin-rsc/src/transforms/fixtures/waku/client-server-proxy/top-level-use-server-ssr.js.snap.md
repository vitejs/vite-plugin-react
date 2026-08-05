## Input

```js
'use server'

import { getEnv } from 'waku'

const privateFunction = () => getEnv('SECRET')

export async function log(mesg) {
  console.log('%s', mesg)
}
```

## client server proxy

**Status:** transformed

**References:** log

```js






export const log = /* #__PURE__ */ $runtime("<id>#log", "log");

```
