const key = 'computed'

export function createObject(value) {
  return {
    action: /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, value),
    [key]: /* #__PURE__ */ $$register($$hoist_1_key, "<id>", "$$hoist_1_key").bind(null, value),
    ["__proto__"]: /* #__PURE__ */ $$register($$hoist_2___proto__, "<id>", "$$hoist_2___proto__").bind(null, value),
    'foo-bar': /* #__PURE__ */ $$register($$hoist_3_anonymous_server_function, "<id>", "$$hoist_3_anonymous_server_function").bind(null, value),
    1.5: /* #__PURE__ */ $$register($$hoist_4_anonymous_server_function, "<id>", "$$hoist_4_anonymous_server_function").bind(null, value),
  }
}

export class Actions {
  static action = /* #__PURE__ */ $$register($$hoist_5_action, "<id>", "$$hoist_5_action");

  static ['computed'] = /* #__PURE__ */ $$register($$hoist_6_computed, "<id>", "$$hoist_6_computed");

  static ["constructor"] = /* #__PURE__ */ $$register($$hoist_7_constructor, "<id>", "$$hoist_7_constructor");
}

;export async function $$hoist_0_action(value) {
      'use server'
      return value
    };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });

;export async function $$hoist_1_key(value) {
      'use server'
      return value + 1
    };
/* #__PURE__ */ Object.defineProperty($$hoist_1_key, "name", { value: "key" });

;export async function $$hoist_2___proto__(value) {
      'use server'
      return value + 2
    };
/* #__PURE__ */ Object.defineProperty($$hoist_2___proto__, "name", { value: "__proto__" });

;export async function $$hoist_3_anonymous_server_function(value) {
      'use server'
      return value + 3
    };
/* #__PURE__ */ Object.defineProperty($$hoist_3_anonymous_server_function, "name", { value: "foo-bar" });

;export async function $$hoist_4_anonymous_server_function(value) {
      'use server'
      return value + 4
    };
/* #__PURE__ */ Object.defineProperty($$hoist_4_anonymous_server_function, "name", { value: "1.5" });

;export async function $$hoist_5_action() {
    'use server'
    return 1
  };
/* #__PURE__ */ Object.defineProperty($$hoist_5_action, "name", { value: "action" });

;export async function $$hoist_6_computed() {
    'use server'
    return 2
  };
/* #__PURE__ */ Object.defineProperty($$hoist_6_computed, "name", { value: "computed" });

;export async function $$hoist_7_constructor() {
    'use server'
    return 3
  };
/* #__PURE__ */ Object.defineProperty($$hoist_7_constructor, "name", { value: "constructor" });
