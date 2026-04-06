function outer() {
  const x = {}
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, __enc([{ y: x.y }]));
}

;export async function $$hoist_0_action($$hoist_encoded) {
    const [x] = __dec($$hoist_encoded);
'use server'
    return x.y.fn()
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
