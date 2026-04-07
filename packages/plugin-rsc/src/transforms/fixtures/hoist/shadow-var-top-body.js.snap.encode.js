function buildAction(config) {
  const cookies = getCookies()

  const submitAction = /* #__PURE__ */ $$register($$hoist_0_submitAction, "<id>", "$$hoist_0_submitAction").bind(null, __enc([config]));

  return submitAction
}

;export async function $$hoist_0_submitAction($$hoist_encoded, formData) {
    const [config] = __dec($$hoist_encoded);
'use server'
    var cookies = formData.get('value')
    return doSomething(config, cookies)
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_submitAction, "name", { value: "submitAction" });
