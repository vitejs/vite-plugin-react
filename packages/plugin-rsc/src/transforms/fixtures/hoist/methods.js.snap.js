const key = 'computed'
const __proto__ = 'computed-proto'

export function createObject(value) {
  return {
    ["action"]: /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, value),
    [key]: /* #__PURE__ */ $$register($$hoist_1_anonymous_server_function, "<id>", "$$hoist_1_anonymous_server_function").bind(null, value),
    ["__proto__"]: /* #__PURE__ */ $$register($$hoist_2___proto__, "<id>", "$$hoist_2___proto__").bind(null, value),
    [__proto__]: /* #__PURE__ */ $$register($$hoist_3_anonymous_server_function, "<id>", "$$hoist_3_anonymous_server_function").bind(null, value),
    ['foo-bar']: /* #__PURE__ */ $$register($$hoist_4_anonymous_server_function, "<id>", "$$hoist_4_anonymous_server_function").bind(null, value),
    [1.5]: /* #__PURE__ */ $$register($$hoist_5_anonymous_server_function, "<id>", "$$hoist_5_anonymous_server_function").bind(null, value),
  }
}

export class Actions {
  static ["action"] = /* #__PURE__ */ $$register($$hoist_6_action, "<id>", "$$hoist_6_action");

  static ['computed'] = /* #__PURE__ */ $$register($$hoist_7_anonymous_server_function, "<id>", "$$hoist_7_anonymous_server_function");

  static [key] = /* #__PURE__ */ $$register($$hoist_8_anonymous_server_function, "<id>", "$$hoist_8_anonymous_server_function");

  static ["constructor"] = /* #__PURE__ */ $$register($$hoist_9_constructor, "<id>", "$$hoist_9_constructor");
}

export function createActions(value) {
  return class Actions {
    static ["action"] = /* #__PURE__ */ $$register($$hoist_10_action, "<id>", "$$hoist_10_action").bind(null, value);
  }
}

;export async function $$hoist_0_action(value, arg) {
      'use server'
      return value + arg
    };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });

;export async function $$hoist_1_anonymous_server_function(value) {
      'use server'
      return value + 1
    };
/* #__PURE__ */ Object.defineProperty($$hoist_1_anonymous_server_function, "name", { value: "anonymous_server_function" });

;export async function $$hoist_2___proto__(value) {
      'use server'
      return value + 2
    };
/* #__PURE__ */ Object.defineProperty($$hoist_2___proto__, "name", { value: "__proto__" });

;export async function $$hoist_3_anonymous_server_function(value) {
      'use server'
      return value + 3
    };
/* #__PURE__ */ Object.defineProperty($$hoist_3_anonymous_server_function, "name", { value: "anonymous_server_function" });

;export async function $$hoist_4_anonymous_server_function(value) {
      'use server'
      return value + 4
    };
/* #__PURE__ */ Object.defineProperty($$hoist_4_anonymous_server_function, "name", { value: "anonymous_server_function" });

;export async function $$hoist_5_anonymous_server_function(value) {
      'use server'
      return value + 5
    };
/* #__PURE__ */ Object.defineProperty($$hoist_5_anonymous_server_function, "name", { value: "anonymous_server_function" });

;export async function $$hoist_6_action() {
    'use server'
    return 1
  };
/* #__PURE__ */ Object.defineProperty($$hoist_6_action, "name", { value: "action" });

;export async function $$hoist_7_anonymous_server_function() {
    'use server'
    return 2
  };
/* #__PURE__ */ Object.defineProperty($$hoist_7_anonymous_server_function, "name", { value: "anonymous_server_function" });

;export async function $$hoist_8_anonymous_server_function() {
    'use server'
    return 3
  };
/* #__PURE__ */ Object.defineProperty($$hoist_8_anonymous_server_function, "name", { value: "anonymous_server_function" });

;export async function $$hoist_9_constructor() {
    'use server'
    return 4
  };
/* #__PURE__ */ Object.defineProperty($$hoist_9_constructor, "name", { value: "constructor" });

;export async function $$hoist_10_action(value) {
      'use server'
      return value
    };
/* #__PURE__ */ Object.defineProperty($$hoist_10_action, "name", { value: "action" });
