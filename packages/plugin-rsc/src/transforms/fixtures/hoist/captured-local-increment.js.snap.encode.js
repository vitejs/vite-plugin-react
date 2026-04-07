// Mutating a captured local is local to the hoisted invocation copy.
function Counter() {
  let local = 0

  const updateLocal = /* #__PURE__ */ $$register($$hoist_0_updateLocal, "<id>", "$$hoist_0_updateLocal").bind(null, __enc([local]));

  return 'something'
}

;export async function $$hoist_0_updateLocal($$hoist_encoded) {
    const [local] = __dec($$hoist_encoded);
'use server'
    local++
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_updateLocal, "name", { value: "updateLocal" });
