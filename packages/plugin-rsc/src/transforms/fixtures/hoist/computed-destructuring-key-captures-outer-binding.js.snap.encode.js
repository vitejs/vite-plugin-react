function outer() {
  const key = 'value'
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, __enc([key]));
}

;export async function $$hoist_0_action($$hoist_encoded, data) {
    const [key] = __dec($$hoist_encoded);
'use server'
    const { [key]: val } = data
    return val
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
