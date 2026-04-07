function outer() {
  const value = 0
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, value);
}

;export async function $$hoist_0_action(value) {
    'use server'
    console.log({ value })
    {
      function value() {}
    }
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
