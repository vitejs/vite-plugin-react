// TODO: recursive action bound to itself causes TDZ (`const recurse = $$register(...).bind(null, recurse, ...)`)
function Parent() {
  const count = 0

  const recurse = /* #__PURE__ */ $$register($$hoist_0_recurse, "<id>", "$$hoist_0_recurse").bind(null, recurse, count);

  return recurse
}

;export async function $$hoist_0_recurse(recurse, count, n) {
    'use server'
    const helper = () => recurse(n - 1)
    return count + helper()
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_recurse, "name", { value: "recurse" });
