function outer() {
  const x = {}
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, { y: x.y });
}

;export async function $$hoist_0_action(x) {
    'use server'
    return x.y.fn()
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
