function outer(outerList) {
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, __enc([outerList]));
}

;export async function $$hoist_0_action($$hoist_encoded) {
    const [outerList] = __dec($$hoist_encoded);
'use server'
    for (const item of outerList) {
      process(item)
    }
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
