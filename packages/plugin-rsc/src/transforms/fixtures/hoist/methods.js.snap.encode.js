const key = 'computed'

export function createObject(value) {
  return {
    action: /* #__PURE__ */ $$register($$hoist_0_action, "<id>", "$$hoist_0_action").bind(null, __enc([value])),
    [key]: /* #__PURE__ */ $$register($$hoist_1_anonymous_server_function, "<id>", "$$hoist_1_anonymous_server_function").bind(null, __enc([value])),
    ["__proto__"]: /* #__PURE__ */ $$register($$hoist_2___proto__, "<id>", "$$hoist_2___proto__").bind(null, __enc([value])),
    'foo-bar': /* #__PURE__ */ $$register($$hoist_3_anonymous_server_function, "<id>", "$$hoist_3_anonymous_server_function").bind(null, __enc([value])),
    1.5: /* #__PURE__ */ $$register($$hoist_4_anonymous_server_function, "<id>", "$$hoist_4_anonymous_server_function").bind(null, __enc([value])),
  }
}

export class Actions {
  static action = /* #__PURE__ */ $$register($$hoist_5_action, "<id>", "$$hoist_5_action");

  static ['computed'] = /* #__PURE__ */ $$register($$hoist_6_computed, "<id>", "$$hoist_6_computed");

  static ["constructor"] = /* #__PURE__ */ $$register($$hoist_7_constructor, "<id>", "$$hoist_7_constructor");
}

export function createActions(value) {
  return class Actions {
    static action = /* #__PURE__ */ $$register($$hoist_8_action, "<id>", "$$hoist_8_action").bind(null, __enc([value]));
  }
}

;export async function $$hoist_0_action($$hoist_encoded) {
      const [value] = __dec($$hoist_encoded);
'use server'
      return value
    };
/* #__PURE__ */ Object.defineProperty($$hoist_0_action, "name", { value: "action" });

;export async function $$hoist_1_anonymous_server_function($$hoist_encoded) {
      const [value] = __dec($$hoist_encoded);
'use server'
      return value + 1
    };
/* #__PURE__ */ Object.defineProperty($$hoist_1_anonymous_server_function, "name", { value: "anonymous_server_function" });

;export async function $$hoist_2___proto__($$hoist_encoded) {
      const [value] = __dec($$hoist_encoded);
'use server'
      return value + 2
    };
/* #__PURE__ */ Object.defineProperty($$hoist_2___proto__, "name", { value: "__proto__" });

;export async function $$hoist_3_anonymous_server_function($$hoist_encoded) {
      const [value] = __dec($$hoist_encoded);
'use server'
      return value + 3
    };
/* #__PURE__ */ Object.defineProperty($$hoist_3_anonymous_server_function, "name", { value: "foo-bar" });

;export async function $$hoist_4_anonymous_server_function($$hoist_encoded) {
      const [value] = __dec($$hoist_encoded);
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

;export async function $$hoist_8_action($$hoist_encoded) {
      const [value] = __dec($$hoist_encoded);
'use server'
      return value
    };
/* #__PURE__ */ Object.defineProperty($$hoist_8_action, "name", { value: "action" });
