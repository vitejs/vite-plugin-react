let count = 0

function Counter() {
  const name = 'value'

  const changeCount = /* #__PURE__ */ $$register($$hoist_0_changeCount, "<id>", "$$hoist_0_changeCount").bind(null, name);

  return 'something'
}

;export async function $$hoist_0_changeCount(name, formData) {
    'use server'
    count += Number(formData.get(name))
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_changeCount, "name", { value: "changeCount" });
