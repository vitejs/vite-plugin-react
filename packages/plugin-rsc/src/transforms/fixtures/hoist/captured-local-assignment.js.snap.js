// Writing to a captured local only mutates the hoisted action's bound
// parameter copy, not the original outer binding.
function Counter() {
  let local = 0

  const updateLocal = /* #__PURE__ */ $$register($$hoist_0_updateLocal, "<id>", "$$hoist_0_updateLocal").bind(null, local);

  return 'something'
}

;export async function $$hoist_0_updateLocal(local) {
    'use server'
    local = 1
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_updateLocal, "name", { value: "updateLocal" });
