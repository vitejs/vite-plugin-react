function outer() {
  const key = 'value'
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, key);
}

;export async function $$hoist_0_action(key, data) {
    'use server'
    const { [key]: val } = data
    return val
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
