function outer(outerList) {
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, outerList);
}

;export async function $$hoist_0_action(outerList) {
    'use server'
    for (const item of outerList) {
      process(item)
    }
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
