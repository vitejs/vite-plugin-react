function outer() {
  const x = {}
  const k = 'y'
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, x, k);
}

;export async function $$hoist_0_action(x, k) {
    'use server'
    return x[k].z
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
