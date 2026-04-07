function Parent() {
  const count = 0

  const recurse = /* #__PURE__ */ $$register($$hoist_0_recurse, "<id>", "$$hoist_0_recurse").bind(null, count);

  return recurse
}

;export async function $$hoist_0_recurse(count, n) {
    'use server'
    const result = (function recurse(m) {
      return m > 0 ? recurse(m - 1) : 0
    })(n)
    return count + result
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_recurse, "name", { value: "recurse" });
