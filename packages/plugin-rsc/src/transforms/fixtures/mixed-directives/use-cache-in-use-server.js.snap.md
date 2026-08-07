## Input

```js
'use server'

export async function defaultAction() {}

export async function overrideAction() {
  'use cache'
}
```

## framework cache RSC transform

**Status:** transformed

**References:** $$hoist_0_overrideAction

```js
'use server'

import { cache as $cache, register as $registerCache } from "cache-runtime";
export const $$hoist_0_overrideAction = /* #__PURE__ */ $registerCache($cache($$hoist_0_overrideAction$$impl), "$$hoist_0_overrideAction");
export async function defaultAction() {}

export const overrideAction = $$hoist_0_overrideAction;

;async function $$hoist_0_overrideAction$$impl() {
  'use cache'
};
/* #__PURE__ */ Object.defineProperty($$hoist_0_overrideAction$$impl, "name", { value: "overrideAction" });
```

## final RSC transform

**Status:** transformed

**References:** $$hoist_0_overrideAction, defaultAction, overrideAction

```js
'use server'

import { cache as $cache, register as $registerCache } from "cache-runtime";
const $$hoist_0_overrideAction = /* #__PURE__ */ $registerCache($cache($$hoist_0_overrideAction$$impl), "$$hoist_0_overrideAction");
async function defaultAction() {}

const overrideAction = $$hoist_0_overrideAction;

;async function $$hoist_0_overrideAction$$impl() {
  'use cache'
};
/* #__PURE__ */ Object.defineProperty($$hoist_0_overrideAction$$impl, "name", { value: "overrideAction" });

$registerServer($$hoist_0_overrideAction, "$$hoist_0_overrideAction");
export { $$hoist_0_overrideAction };

$registerServer(defaultAction, "defaultAction");
export { defaultAction };

$registerServer(overrideAction, "overrideAction");
export { overrideAction };
```

## browser and SSR proxy transform

**Status:** transformed

**References:** defaultAction, overrideAction

```js


export const defaultAction = /* #__PURE__ */ $serverProxy("defaultAction");


export const overrideAction = /* #__PURE__ */ $serverProxy("overrideAction");

```
