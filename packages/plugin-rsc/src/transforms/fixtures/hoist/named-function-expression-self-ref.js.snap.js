// TODO: named function expression self-reference `self` is left dangling in hoisted body
function outer(count) {
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, count)
}

;export async function $$hoist_0_action(count, n) {
    'use server'
    if (n > 0) return self(n - 1)
    return count
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
