function outer() {
  const x = {}
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, __enc([x]));
}

;export async function $$hoist_0_action($$hoist_encoded) {
    const [x] = __dec($$hoist_encoded);
'use server'
    return [x.y.z, Object.keys(x)]
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
