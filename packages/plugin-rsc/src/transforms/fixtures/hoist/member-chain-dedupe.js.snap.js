function outer() {
  const x = {}
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, { y: x.y, w: { v: x.w.v } });
}

;export async function $$hoist_0_action(x) {
    'use server'
    return [x.y.z, Object.keys(x.y), x.w.v]
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
