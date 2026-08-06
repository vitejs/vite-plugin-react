// Adapted from React's Next.js server action examples.
export default function Page() {
  const x = 0
  const action = validator(/* #__PURE__ */ $$register($$hoist_0_anonymous_server_function, "<id>", "$$hoist_0_anonymous_server_function").bind(null, x))
}

function validator(action) {
  return /* #__PURE__ */ $$register($$hoist_1_anonymous_server_function, "<id>", "$$hoist_1_anonymous_server_function").bind(null, action)
}

;export async function $$hoist_0_anonymous_server_function(x, y) {
    'use server'
    return x + y
  };
/* #__PURE__ */ Object.defineProperty($$hoist_0_anonymous_server_function, "name", { value: "anonymous_server_function" });

;export async function $$hoist_1_anonymous_server_function(action, arg) {
    'use server'
    return action(arg)
  };
/* #__PURE__ */ Object.defineProperty($$hoist_1_anonymous_server_function, "name", { value: "anonymous_server_function" });
