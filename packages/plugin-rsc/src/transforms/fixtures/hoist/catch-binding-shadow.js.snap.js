function outer(config, err) {
  const action = /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, { value: config.value });
}

;export async function $$hoist_0_action(config) {
    'use server'
    try {
      return config.value
    } catch (err) {
      return err.message
    }
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });
