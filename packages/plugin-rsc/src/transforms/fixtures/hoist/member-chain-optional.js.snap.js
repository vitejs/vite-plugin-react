function outer() {
  const x = {}
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, x);
}

function outer2() {
  const a = {}
  const action = /* #__PURE__ */ $$register($$hoist_1_action, "<id>", "$$hoist_1_action").bind(null, { b: a.b });
}

;export async function $$hoist_0_action(x) {
    'use server'
    return x?.y.z
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });

;export async function $$hoist_1_action(a) {
    'use server'
    return a.b?.c
  };
/* #__PURE__ */ Object.defineProperty($$hoist_1_action, "name", { value: "action" });
