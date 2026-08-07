## Input

```js
'use cache'

export async function defaultAction() {}

export async function overrideAction() {
  'use server'
}
```

## framework cache RSC transform

**Status:** transformed

**References:** defaultAction

```js
'use cache'

import { cache as $cache, register as $registerCache } from "cache-runtime";
async function defaultAction() {}

export async function overrideAction() {
  'use server'
}
defaultAction = /* #__PURE__ */ $registerCache($cache(defaultAction), "defaultAction");
export { defaultAction };
```

## final RSC transform

**Status:** transformed

**References:** $$hoist_0_overrideAction

```js
'use cache'

import { cache as $cache, register as $registerCache } from "cache-runtime";
async function defaultAction() {}

export const overrideAction = /* #__PURE__ */ $registerServer($$hoist_0_overrideAction, "$$hoist_0_overrideAction");
defaultAction = /* #__PURE__ */ $registerCache($cache(defaultAction), "defaultAction");
export { defaultAction };

;export async function $$hoist_0_overrideAction() {
  'use server'
};
/* #__PURE__ */ Object.defineProperty($$hoist_0_overrideAction, "name", { value: "overrideAction" });
```

## browser and SSR proxy transform

**Status:** transformed

**References:** defaultAction, overrideAction

```js


export const defaultAction = /* #__PURE__ */ $cacheProxy("defaultAction");


export const overrideAction = /* #__PURE__ */ $cacheProxy("overrideAction");

```
