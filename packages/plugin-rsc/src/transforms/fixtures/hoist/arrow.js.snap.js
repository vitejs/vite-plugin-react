let count = 0

function Counter() {
  const name = 'value'

  return {
    type: 'form',
    action: /* #__PURE__ */ $$register($$hoist_0_anonymous_server_function, "<id>", "$$hoist_0_anonymous_server_function").bind(null, name),
  }
}

;export function $$hoist_0_anonymous_server_function(name, formData) {
      'use server'
      count += Number(formData.get(name))
    };
/* #__PURE__ */ Object.defineProperty($$hoist_0_anonymous_server_function, "name", { value: "anonymous_server_function" });
