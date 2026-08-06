let count = 0

function Counter() {
  const name = 'value'

  const changeCount = /* #__PURE__ */ $$register($$hoist_0_changeCount, "<id>", "$$hoist_0_changeCount").bind(null, __enc([name]));

  const changeCount2 = /* #__PURE__ */ $$register($$hoist_1_changeCount2, "<id>", "$$hoist_1_changeCount2").bind(null, __enc([name]));

  return 'something'
}

;export async function $$hoist_0_changeCount($$hoist_encoded, formData) {
    const [name] = __dec($$hoist_encoded);
'use server'
    count += Number(formData.get(name))
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_changeCount, "name", { value: "changeCount" });

;export async function $$hoist_1_changeCount2($$hoist_encoded, formData) {
    const [name] = __dec($$hoist_encoded);
'use server'
    count += Number(formData.get(name))
  };
/* #__PURE__ */ Object.defineProperty($$hoist_1_changeCount2, "name", { value: "changeCount2" });
