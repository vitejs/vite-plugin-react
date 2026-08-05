## Input

```js
'use server'

const privateFunction = () => 'Secret'

export const log1 = async function (mesg) {
  console.log(mesg)
}

export const log2 = async (mesg) => {
  console.log(mesg)
}

export async function log3(mesg) {
  console.log(mesg)
}

export default async function log4(mesg) {
  console.log(mesg)
}
```

## client server proxy

**Status:** transformed

**References:** log1, log2, log3, default

```js




export const log1 = /* #__PURE__ */ $runtime("<id>#log1", "log1");


export const log2 = /* #__PURE__ */ $runtime("<id>#log2", "log2");


export const log3 = /* #__PURE__ */ $runtime("<id>#log3", "log3");


export default /* #__PURE__ */ $runtime("<id>#default", "default");

```
