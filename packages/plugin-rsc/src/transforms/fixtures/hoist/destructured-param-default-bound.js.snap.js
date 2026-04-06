function outer(outerDefault) {
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, outerDefault);
}

;export async function $$hoist_0_action(outerDefault, { x = outerDefault } = {}) {
    'use server'
    return x
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
