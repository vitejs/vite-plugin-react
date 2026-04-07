// TODO: follow up if this edge case matters.
// The current transform self-binds `action`, which is suspicious enough to
// keep as an intentionally verified TODO fixture for now.
function outer() {
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, __enc([action]));
}

;export async function $$hoist_0_action($$hoist_encoded) {
    const [action] = __dec($$hoist_encoded);
'use server'
    if (false) {
      return action()
    }
    return 0
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
