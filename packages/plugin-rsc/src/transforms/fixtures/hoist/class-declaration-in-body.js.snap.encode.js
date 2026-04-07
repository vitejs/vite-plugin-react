function outer(config) {
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, __enc([{ value: config.value }]));
}

;export async function $$hoist_0_action($$hoist_encoded) {
    const [config] = __dec($$hoist_encoded);
'use server'
    class Helper {
      run() {
        return config.value
      }
    }
    return new Helper().run()
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
