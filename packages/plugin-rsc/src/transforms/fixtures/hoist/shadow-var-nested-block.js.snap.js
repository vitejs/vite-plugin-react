function buildAction(config) {
  const cookies = getCookies()

  const submitAction = /* #__PURE__ */ $$register($$hoist_0_submitAction, "<id>", "$$hoist_0_submitAction").bind(null, config);

  return submitAction
}

;export async function $$hoist_0_submitAction(config, formData) {
    'use server'
    if (condition) {
      var cookies = formData.get('value')
    }
    return doSomething(config, cookies)
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_submitAction, "name", { value: "submitAction" });
