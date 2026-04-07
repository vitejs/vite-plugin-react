function outer(config) {
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, { value: config.value });
}

;export async function $$hoist_0_action(config) {
    'use server'
    class Helper {
      run() {
        return config.value
      }
    }
    return new Helper().run()
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
