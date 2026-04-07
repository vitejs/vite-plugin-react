function buildAction(cookies) {
  const submitAction = /* #__PURE__ */ $$register($$hoist_0_submitAction, "<id>", "$$hoist_0_submitAction");

  return submitAction
}

;export async function $$hoist_0_submitAction(formData) {
    'use server'
    const cookies = formData.get('value')
    return cookies
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_submitAction, "name", { value: "submitAction" });
