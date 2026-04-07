// TODO: recursive action bound to itself causes TDZ (`const recurse = $$register(...).bind(null, recurse, ...)`)
function Parent() {
  const count = 0

  const recurse = /* #__PURE__ */ $$register($$hoist_0_recurse, "<id>", "$$hoist_0_recurse").bind(null, __enc([recurse, count]));

  return recurse
}

;export async function $$hoist_0_recurse($$hoist_encoded, n) {
    const [recurse,count] = __dec($$hoist_encoded);
'use server'
    const helper = () => recurse(n - 1)
    return count + helper()
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_recurse, "name", { value: "recurse" });
