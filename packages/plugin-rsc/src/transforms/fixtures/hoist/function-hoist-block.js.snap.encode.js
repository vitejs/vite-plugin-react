function outer() {
  const value = 0
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, __enc([value]));
}

;export async function $$hoist_0_action($$hoist_encoded) {
    const [value] = __dec($$hoist_encoded);
'use server'
    console.log({ value })
    {
      function value() {}
    }
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
