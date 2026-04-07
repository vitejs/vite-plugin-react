function outer() {
  const x = {}
  const k = 'y'
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, __enc([x, k]));
}

;export async function $$hoist_0_action($$hoist_encoded) {
    const [x,k] = __dec($$hoist_encoded);
'use server'
    return x[k].z
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
