function outer(outerDefault) {
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, __enc([outerDefault]));
}

;export async function $$hoist_0_action($$hoist_encoded, ...$$hoist_args) {
    const [outerDefault] = __dec($$hoist_encoded);
var [{ x = outerDefault } = {}] = $$hoist_args;
'use server'
    return x
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
