## Input

```js
const actions = {
  log: async (mesg) => {
    'use server'
    console.log('%s', mesg)
  },
}

async function log2(mesg) {
  'use server'
  console.log('%s', mesg)
}

const log3 = async function (mesg) {
  'use server'
  console.log('%s', mesg)
}

const log4 = async (mesg) => {
  'use server'
  console.log('%s', mesg)
}

const defaultFn = async function (mesg) {
  'use server'
  console.log('%s', mesg)
}

export default defaultFn
```

## server action

**Status:** transformed

**References:** $$hoist_0_anonymous_server_function, $$hoist_1_log2, $$hoist_2_log3, $$hoist_3_log4, $$hoist_4_defaultFn

```js
const actions = {
  log: /* #__PURE__ */ $runtime($$hoist_0_anonymous_server_function, "<id>", "$$hoist_0_anonymous_server_function"),
}

const log2 = /* #__PURE__ */ $runtime($$hoist_1_log2, "<id>", "$$hoist_1_log2");

const log3 = /* #__PURE__ */ $runtime($$hoist_2_log3, "<id>", "$$hoist_2_log3")

const log4 = /* #__PURE__ */ $runtime($$hoist_3_log4, "<id>", "$$hoist_3_log4")

const defaultFn = /* #__PURE__ */ $runtime($$hoist_4_defaultFn, "<id>", "$$hoist_4_defaultFn")

export default defaultFn

;export async function $$hoist_0_anonymous_server_function(mesg) {
    'use server'
    console.log('%s', mesg)
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_anonymous_server_function, "name", { value: "anonymous_server_function" });

;export async function $$hoist_1_log2(mesg) {
  'use server'
  console.log('%s', mesg)
};
/* #__PURE__ */ Object.defineProperty($$hoist_1_log2, "name", { value: "log2" });

;export async function $$hoist_2_log3(mesg) {
  'use server'
  console.log('%s', mesg)
};
/* #__PURE__ */ Object.defineProperty($$hoist_2_log3, "name", { value: "log3" });

;export async function $$hoist_3_log4(mesg) {
  'use server'
  console.log('%s', mesg)
};
/* #__PURE__ */ Object.defineProperty($$hoist_3_log4, "name", { value: "log4" });

;export async function $$hoist_4_defaultFn(mesg) {
  'use server'
  console.log('%s', mesg)
};
/* #__PURE__ */ Object.defineProperty($$hoist_4_defaultFn, "name", { value: "defaultFn" });
```
