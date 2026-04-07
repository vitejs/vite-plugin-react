function outer() {
  const x = {}
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, __enc([{ y: { z: x.y.z, w: x.y.w } }]));
}

;export async function $$hoist_0_action($$hoist_encoded) {
    const [x] = __dec($$hoist_encoded);
'use server'
    return [x.y.z, x.y.w]
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
